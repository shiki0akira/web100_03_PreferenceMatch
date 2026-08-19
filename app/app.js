/*
 * 喜好二選一的前端。沒有 bundler，四個畫面在同一份 HTML 裡靠 showView() 切換，
 * 房號放查詢字串 ?room=XXXX（QR code 掃進來就是這個網址）。
 *
 * 兩個重點跟搶答那個專案不一樣：
 *
 * 1. **主持人與玩家共用同一個房間畫面。** 主持人預設只控場，但可以在大廳打開
 *    「我也要一起作答」下場；做成兩套版面會讓那個開關處處要判斷兩次。
 *    差別只在多出來的控制項（選題、開始、下一題、關房）。
 * 2. **倒數只是視覺效果。** 能不能作答一律由伺服器判斷（見 src/room.js 的 deadline），
 *    這裡的動畫跑完了不代表伺服器那邊已經關門，反之亦然。
 */
(function () {
  'use strict';

  var T = window.T;
  var CFG = window.MATCH;
  var BANK = window.QUESTIONS;
  var AVATARS = window.AVATARS;

  // 這幾個 key 跟系列其他專案共用，不要各專案自己發明一套
  var CLIENT_KEY = 'web100-client-id';
  // 暱稱與頭像存成一份 profile，之後的 Web100 遊戲都能直接沿用，
  // 不用為了「記住我是誰」去做帳號系統
  var PROFILE_KEY = 'web100-profile';

  var MIN_QUESTIONS = 1;
  var MAX_QUESTIONS = 20;
  var URGENT_MS = 3000;

  /*
   * 正式網域上的頁面是 Vercel 代理過來的，而 Vercel 代理外部網址時對 WebSocket 升級
   * 的支援不可靠，所以 API 與 WebSocket 直連 Worker。本機開發、區網測試、
   * 直接開 workers.dev 都維持同源。
   */
  var API_ORIGIN = location.origin === CFG.siteOrigin ? CFG.workerOrigin : location.origin;
  var API = API_ORIGIN + CFG.base + '/api';

  var el = {};
  var state = {
    clientId: '',
    role: '',
    code: '',
    room: null,
    ws: null,
    reconnectTimer: 0,
    reconnectDelay: 500,
    closing: false,
    view: '',
    joinReported: false,
    resultsReported: false,
    // 主持人的選題只從伺服器同步一次，之後以本機為準（見 syncSettingsOnce）
    settingsSynced: false,
    // 建房畫面的選題狀態
    selected: [],
    custom: [],
    avatar: '',
    // 倒數：收到 state 當下換算成本機的截止時刻，之後自己跑動畫，不用跟伺服器對時
    deadlineAt: 0,
    frame: 0,
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    state.clientId = loadClientId();
    loadProfile();

    renderCategories();
    renderAvatarPicker();
    bindEvents();

    var code = new URLSearchParams(location.search).get('room');
    if (code) {
      state.code = code.toUpperCase();
      checkRoomThenJoin();
    } else {
      showView('home');
    }
  }

  function cacheElements() {
    var ids = [
      'view-home', 'view-join', 'view-room', 'view-error',
      'category-list', 'selected-count', 'custom-input', 'custom-add', 'custom-list',
      'max-players', 'group-size', 'host-plays', 'create-room', 'create-error',
      'join-code', 'join-room', 'join-error',
      'join-title', 'avatar-picker', 'nickname', 'enter-room', 'nickname-error',
      'role-badge', 'exit-room', 'share-card', 'room-code', 'copy-link', 'share-url', 'qr-box',
      'setup-card', 'lobby-card', 'player-count', 'player-list', 'player-empty',
      'start-game-block', 'start-game', 'start-game-error', 'waiting-hint',
      'question-card', 'question-progress', 'countdown', 'timer-fill', 'question-text',
      'ox-buttons', 'answer-o', 'answer-x', 'answer-hint',
      'tally', 'tally-o-count', 'tally-o-list', 'tally-x-count', 'tally-x-list',
      'next-question',
      'results-card', 'my-group-card', 'my-group-members', 'my-group-topics', 'my-group-empty',
      'all-groups', 'all-groups-heading',
      'error-title', 'error-desc', 'conn-banner',
      'confirm-dialog', 'confirm-title', 'confirm-desc', 'confirm-cancel', 'confirm-ok',
      'closed-dialog', 'closed-ok', 'kicked-dialog', 'kicked-ok',
    ];
    for (var i = 0; i < ids.length; i += 1) {
      el[camel(ids[i])] = document.getElementById(ids[i]);
    }
  }

  function camel(id) {
    return id.replace(/-([a-z])/g, function (whole, letter) {
      return letter.toUpperCase();
    });
  }

  /* ---------- 文案 ---------- */

  // t('playerCount', { n: 3, max: 10 })：{n} 這種佔位符在 locales 裡是原樣保留的
  function t(key, vars) {
    var text = T[key] || '';
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return name in vars ? vars[name] : whole;
    });
  }

  /* ---------- 身分與 profile ---------- */

  function loadClientId() {
    var id = '';
    try {
      id = localStorage.getItem(CLIENT_KEY) || '';
    } catch (e) {
      /* 無痕模式：這一場還是能玩，只是重整後會被當成新的人 */
    }
    if (!id) {
      id = 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try {
        localStorage.setItem(CLIENT_KEY, id);
      } catch (e) {
        /* 同上 */
      }
    }
    return id;
  }

  function loadProfile() {
    var saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    } catch (e) {
      /* 存壞了就當作沒有 */
    }
    state.avatar = (saved && saved.avatar) || pickAvatarFor(state.clientId);
    if (saved && saved.nickname && el.nickname) el.nickname.value = saved.nickname;
  }

  function saveProfile() {
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ nickname: el.nickname.value.trim(), avatar: state.avatar }),
      );
    } catch (e) {
      /* 記不住就算了，不影響這一場 */
    }
  }

  // 沒選過的人也要有頭像，用 clientId 決定，同一個人每次進來都是同一張臉
  function pickAvatarFor(clientId) {
    var hash = 0;
    for (var i = 0; i < clientId.length; i += 1) {
      hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
    }
    return AVATARS[hash % AVATARS.length].id;
  }

  function avatarSvg(id, size) {
    var found = null;
    for (var i = 0; i < AVATARS.length; i += 1) {
      if (AVATARS[i].id === id) found = AVATARS[i];
    }
    // 伺服器不驗證頭像 id（見 src/room.js 的 cleanAvatar），對不到就退回用 id 推算
    if (!found) found = AVATARS[0];
    return (
      '<svg class="avatar" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" ' +
      'aria-hidden="true" focusable="false"><rect width="64" height="64" fill="' + found.bg +
      '"/>' + found.svg + '</svg>'
    );
  }

  /* ---------- 建房：選題 ---------- */

  function renderCategories() {
    var html = '';
    for (var i = 0; i < BANK.categories.length; i += 1) {
      var category = BANK.categories[i];
      var questions = questionsIn(category);
      var open = BANK.defaultCategories.indexOf(category) >= 0;

      html +=
        '<details class="cat" data-category="' + category + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + escapeHtml(t('category' + capitalize(category))) +
        '<span class="cat-count" data-count="' + category + '"></span></summary>' +
        '<label class="check-row cat-all"><input type="checkbox" data-all="' + category + '" />' +
        '<span>' + escapeHtml(t('categorySelectAll')) + '</span></label>' +
        '<ul class="q-list">';

      for (var j = 0; j < questions.length; j += 1) {
        var question = questions[j];
        var checked = open ? ' checked' : '';
        if (checked) state.selected.push(question.id);
        html +=
          '<li><label class="check-row"><input type="checkbox" data-question="' +
          escapeHtml(question.id) + '"' + checked + ' />' +
          '<span>' + escapeHtml(question.text) + '</span></label></li>';
      }
      html += '</ul></details>';
    }
    el.categoryList.innerHTML = html;
    updateSelectedCount();
  }

  function questionsIn(category) {
    return BANK.list.filter(function (question) {
      return question.category === category;
    });
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function updateSelectedCount() {
    var total = state.selected.length + state.custom.length;
    el.selectedCount.textContent = t('selectedCount', { n: total });

    for (var i = 0; i < BANK.categories.length; i += 1) {
      var category = BANK.categories[i];
      var questions = questionsIn(category);
      var picked = questions.filter(function (question) {
        return state.selected.indexOf(question.id) >= 0;
      }).length;

      var counter = el.categoryList.querySelector('[data-count="' + category + '"]');
      if (counter) counter.textContent = picked + ' / ' + questions.length;

      var all = el.categoryList.querySelector('[data-all="' + category + '"]');
      if (all) {
        all.checked = picked === questions.length;
        // 部分選取用 indeterminate，不然「全選」看起來像沒選
        all.indeterminate = picked > 0 && picked < questions.length;
      }
    }
  }

  // 只重畫，不回送伺服器。從伺服器同步回來時用這支，才不會又繞一圈送回去
  function renderCustomListOnly() {
    var html = '';
    for (var i = 0; i < state.custom.length; i += 1) {
      html +=
        '<li><span class="text">' + escapeHtml(state.custom[i]) + '</span>' +
        '<button class="btn-outline btn-danger" type="button" data-remove="' + i + '" ' +
        'aria-label="' + escapeHtml(t('customRemoveLabel')) + '">✕</button></li>';
    }
    el.customList.innerHTML = html;
  }

  function renderCustomList() {
    renderCustomListOnly();
    updateSelectedCount();
    sendSettings();
  }

  function addCustomQuestion() {
    var text = el.customInput.value.replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (state.selected.length + state.custom.length >= MAX_QUESTIONS) {
      return showError(el.startGameError, t('errTooManyQuestions'));
    }
    state.custom.push(text);
    el.customInput.value = '';
    renderCustomList();
  }

  /* ---------- 頭像選擇 ---------- */

  function renderAvatarPicker() {
    var html = '';
    for (var i = 0; i < AVATARS.length; i += 1) {
      var avatar = AVATARS[i];
      html +=
        '<button class="avatar-option" type="button" role="radio" data-avatar="' + avatar.id +
        '" aria-checked="' + (avatar.id === state.avatar) + '" aria-label="' +
        escapeHtml(t('avatarLabel')) + ' ' + (i + 1) + '">' + avatarSvg(avatar.id, 56) + '</button>';
    }
    el.avatarPicker.innerHTML = html;
  }

  function selectAvatar(id) {
    state.avatar = id;
    var options = el.avatarPicker.querySelectorAll('[data-avatar]');
    for (var i = 0; i < options.length; i += 1) {
      options[i].setAttribute('aria-checked', String(options[i].dataset.avatar === id));
    }
  }

  /* ---------- 事件 ---------- */

  function bindEvents() {
    el.categoryList.addEventListener('change', onQuestionToggle);
    el.customAdd.addEventListener('click', addCustomQuestion);
    el.customInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomQuestion();
      }
    });
    el.customList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove]');
      if (!button) return;
      state.custom.splice(Number(button.dataset.remove), 1);
      renderCustomList();
    });

    el.createRoom.addEventListener('click', createRoom);
    el.joinRoom.addEventListener('click', joinByCode);
    el.joinCode.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') joinByCode();
    });

    el.avatarPicker.addEventListener('click', function (event) {
      var button = event.target.closest('[data-avatar]');
      if (button) selectAvatar(button.dataset.avatar);
    });
    el.enterRoom.addEventListener('click', enterRoom);
    el.nickname.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') enterRoom();
    });

    el.groupSize.addEventListener('change', sendSettings);
    el.hostPlays.addEventListener('change', sendSettings);

    el.copyLink.addEventListener('click', copyShareLink);
    el.startGame.addEventListener('click', startGame);
    el.nextQuestion.addEventListener('click', function () {
      send({ t: 'next' });
    });
    el.answerO.addEventListener('click', function () {
      answer('O');
    });
    el.answerX.addEventListener('click', function () {
      answer('X');
    });
    el.exitRoom.addEventListener('click', confirmExit);
    el.playerList.addEventListener('click', onKick);

    el.confirmCancel.addEventListener('click', function () {
      el.confirmDialog.close();
    });
    el.closedOk.addEventListener('click', backHome);
    el.kickedOk.addEventListener('click', backHome);
  }

  function onQuestionToggle(event) {
    var box = event.target;

    if (box.dataset.all) {
      var questions = questionsIn(box.dataset.all);
      for (var i = 0; i < questions.length; i += 1) {
        setSelected(questions[i].id, box.checked);
        var one = el.categoryList.querySelector('[data-question="' + questions[i].id + '"]');
        if (one) one.checked = box.checked;
      }
    } else if (box.dataset.question) {
      setSelected(box.dataset.question, box.checked);
    }
    updateSelectedCount();
    sendSettings();
  }

  function setSelected(id, on) {
    var at = state.selected.indexOf(id);
    if (on && at < 0) state.selected.push(id);
    if (!on && at >= 0) state.selected.splice(at, 1);
  }

  /* ---------- 建房 / 加入 ---------- */

  /*
   * 首頁只送人數上限，跟搶答遊戲一樣。題目與其他設定等進了大廳再由 sendSettings() 送。
   * 主持人也要填暱稱——他預設會一起作答，而且大廳名單上要看得到他。
   */
  function createRoom() {
    hideError(el.createError);
    el.createRoom.disabled = true;

    fetch(API + '/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hostId: state.clientId,
        maxPlayers: Number(el.maxPlayers.value) || 10,
      }),
    })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error('create_failed'));
      })
      .then(function (data) {
        track('match_room_created');
        state.code = data.code;
        showJoinForm();
      })
      .catch(function () {
        showError(el.createError, t('errCreateFailed'));
      })
      .finally(function () {
        el.createRoom.disabled = false;
      });
  }

  /*
   * 把目前的選題與設定整份送給伺服器。
   *
   * 每次改動都送完整清單而不是增減指令：主持人可能開了兩個分頁，增減指令會愈疊愈亂，
   * 整份覆蓋則不管誰後送都收斂到同一個狀態。也順便讓主持人重整之後選擇還在
   * （狀態存在房間裡，不是存在這個分頁的記憶體裡）。
   */
  function sendSettings() {
    var questions = [];
    // 依題庫順序送出，不是依勾選順序：出題順序才跟主持人看到的一致
    for (var i = 0; i < BANK.list.length; i += 1) {
      if (state.selected.indexOf(BANK.list[i].id) >= 0) questions.push({ id: BANK.list[i].id });
    }
    for (var j = 0; j < state.custom.length; j += 1) questions.push({ text: state.custom[j] });

    send({
      t: 'settings',
      questions: questions,
      groupSize: Number(el.groupSize.value) || 4,
      hostPlays: el.hostPlays.checked,
    });
  }

  function startGame() {
    hideError(el.startGameError);
    var total = state.selected.length + state.custom.length;
    if (total < MIN_QUESTIONS) return showError(el.startGameError, t('errNoQuestions'));
    if (total > MAX_QUESTIONS) return showError(el.startGameError, t('errTooManyQuestions'));
    send({ t: 'startGame' });
  }

  function joinByCode() {
    hideError(el.joinError);
    var code = el.joinCode.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) return showError(el.joinError, t('errBadCode'));

    state.code = code;
    checkRoomThenJoin();
  }

  // 先問伺服器房間在不在，打錯代碼的人才不會卡在填暱稱之後才被踢回來
  function checkRoomThenJoin() {
    fetch(API + '/rooms/' + state.code)
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error('room_not_found'));
      })
      .then(function () {
        showJoinForm();
      })
      .catch(function () {
        if (state.view === 'home') showError(el.joinError, t('errRoomNotFound'));
        else showFatal(t('errorTitle'), t('errRoomNotFound'));
      });
  }

  function showJoinForm() {
    el.joinTitle.textContent = t('joinTitle', { code: state.code });
    showView('join');
    el.nickname.focus();
  }

  function enterRoom() {
    hideError(el.nicknameError);
    if (!el.nickname.value.trim()) return showError(el.nicknameError, t('errNicknameRequired'));
    saveProfile();
    connect();
  }

  /* ---------- 連線 ---------- */

  function connect() {
    if (state.ws) state.ws.close();

    var scheme = API_ORIGIN.indexOf('https') === 0 ? 'wss' : 'ws';
    var url = scheme + '://' + API_ORIGIN.replace(/^https?:\/\//, '') +
      CFG.base + '/api/rooms/' + state.code + '/ws';

    var ws = new WebSocket(url);
    state.ws = ws;

    ws.addEventListener('open', function () {
      state.reconnectDelay = 500;
      hideBanner();
      ws.send(JSON.stringify({
        t: 'hello',
        clientId: state.clientId,
        nickname: el.nickname.value.trim(),
        avatar: state.avatar,
      }));
    });

    ws.addEventListener('message', function (event) {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      handleMessage(msg);
    });

    ws.addEventListener('close', function () {
      if (state.closing) return;
      showBanner(t('connLost'));
      scheduleReconnect();
    });
  }

  // 退避重連：手機切回前景時大家會同時醒來，固定間隔會一起打伺服器
  function scheduleReconnect() {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connect, state.reconnectDelay);
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 8000);
  }

  function send(msg) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(msg));
  }

  function handleMessage(msg) {
    if (msg.t === 'welcome') {
      state.role = msg.you.role;
      // 「我是主持人還是玩家」不由前端決定，一律等伺服器在 welcome 裡回答
      if (!state.joinReported) {
        track('match_player_joined');
        state.joinReported = true;
      }
      showView('room');
      return;
    }

    if (msg.t === 'state') {
      state.room = msg.state;
      renderRoom();
      return;
    }

    if (msg.t === 'kicked') {
      state.closing = true;
      el.kickedDialog.showModal();
      return;
    }

    if (msg.t === 'closed') {
      state.closing = true;
      el.closedDialog.showModal();
      return;
    }

    if (msg.t === 'error') handleServerError(msg.code);
  }

  function handleServerError(code) {
    var fatal = {
      room_not_found: t('errRoomNotFound'),
      room_full: t('errRoomFull'),
      room_started: t('errRoomStarted'),
    };
    if (fatal[code]) {
      state.closing = true;
      return showFatal(t('errorTitle'), fatal[code]);
    }
    if (code === 'nickname_required') {
      showView('join');
      showError(el.nicknameError, t('errNicknameRequired'));
    }
    // too_late / stale_question 不提示：畫面上倒數已經歸零，再跳訊息只是吵
  }

  /* ---------- 房間畫面 ---------- */

  function renderRoom() {
    var room = state.room;
    var isHost = state.role === 'host';

    el.roleBadge.textContent = isHost ? t('hostBadge') : t('playerBadge');
    el.exitRoom.textContent = isHost ? t('closeRoomButton') : t('leaveRoomButton');

    var inLobby = room.status === 'lobby';
    var inResults = room.status === 'results';

    /*
     * 每張卡片的顯示與否**全部**在這裡決定，不要散到各自的 render 函式裡。
     * 選題卡原本只在 renderLobby() 設 hidden，一離開大廳就沒人再管它，
     * 結果整場遊戲跟結算頁都還掛著。
     */
    el.shareCard.hidden = !inLobby;
    el.setupCard.hidden = !(inLobby && isHost);
    el.lobbyCard.hidden = !inLobby;
    el.questionCard.hidden = inLobby || inResults;
    el.resultsCard.hidden = !inResults;

    if (inLobby) renderLobby(room, isHost);
    else if (inResults) renderResults(room);
    else renderQuestion(room, isHost);
  }

  function renderLobby(room, isHost) {
    if (isHost) syncSettingsOnce(room);

    el.roomCode.textContent = room.code;
    el.shareUrl.textContent = shareLink();
    renderQr();

    el.playerCount.textContent = t('playerCount', { n: room.players.length, max: room.maxPlayers });
    el.playerEmpty.hidden = room.players.length > 0;

    var html = '';
    for (var i = 0; i < room.players.length; i += 1) {
      var player = room.players[i];
      html +=
        '<li class="' + (player.online ? '' : 'is-offline') + '">' +
        avatarSvg(player.avatar, 32) +
        '<span class="name">' + escapeHtml(player.nickname) + '</span>' +
        (player.host ? '<span class="offline">' + escapeHtml(t('hostTag')) + '</span>' : '') +
        (player.online ? '' : '<span class="offline">' + escapeHtml(t('offlineTag')) + '</span>') +
        (isHost && !player.host
          ? '<button class="btn-outline btn-danger" type="button" data-kick="' + player.id +
            '" aria-label="' + escapeHtml(t('kickLabel')) + '">✕</button>'
          : '') +
        '</li>';
    }
    el.playerList.innerHTML = html;

    el.startGameBlock.hidden = !isHost;
    el.waitingHint.hidden = isHost;
  }

  /*
   * 主持人重整之後，把伺服器上的選題還原到畫面。
   *
   * **只做一次**。每次廣播都套的話，主持人正在勾選時會被自己送出去、繞一圈回來的狀態
   * 覆蓋掉，游標與展開狀態都會跳（搶答那邊的題目輸入框踩過同樣的坑，用 questionSynced 擋）。
   * 同步完之後以本機為準，本機每次改動都會整份送出去。
   */
  function syncSettingsOnce(room) {
    if (state.settingsSynced || !room.questions) return;
    state.settingsSynced = true;

    // 剛開的房間伺服器上是空的，這時要保留前端的預設勾選，並把它送上去
    if (!room.questions.length) return sendSettings();

    state.selected = [];
    state.custom = [];
    for (var i = 0; i < room.questions.length; i += 1) {
      var question = room.questions[i];
      if (question.text) state.custom.push(question.text);
      else state.selected.push(question.id);
    }

    var boxes = el.categoryList.querySelectorAll('[data-question]');
    for (var j = 0; j < boxes.length; j += 1) {
      boxes[j].checked = state.selected.indexOf(boxes[j].dataset.question) >= 0;
    }
    el.groupSize.value = room.groupSize;
    el.hostPlays.checked = room.hostPlays;

    renderCustomListOnly();
    updateSelectedCount();
  }

  function renderQuestion(room, isHost) {
    var locked = room.status === 'reveal';
    var mine = myAnswer(room);

    el.questionProgress.textContent = t('questionProgress', {
      current: room.index + 1,
      total: room.questionCount,
    });
    // 內建題只送 id，文字在各自的語言裡查；自訂題沒辦法翻譯，原樣顯示
    el.questionText.textContent = questionText(room.question);

    var canAnswer = !locked && (state.role === 'player' || room.hostPlays);
    el.oxButtons.hidden = state.role === 'host' && !room.hostPlays;
    el.answerO.disabled = !canAnswer;
    el.answerX.disabled = !canAnswer;
    el.answerO.classList.toggle('chosen', mine === 'O');
    el.answerX.classList.toggle('chosen', mine === 'X');

    if (locked) el.answerHint.textContent = mine ? t('answerHintLocked') : t('answerHintMissed');
    else el.answerHint.textContent = t('answerHintOpen');

    el.tally.hidden = !locked;
    if (locked) renderTally(room);

    startCountdown(room, locked);

    var last = room.index + 1 >= room.questionCount;
    el.nextQuestion.hidden = !(isHost && locked);
    el.nextQuestion.textContent = last ? t('seeResultsButton') : t('nextQuestionButton');
  }

  function questionText(question) {
    if (!question) return '';
    if (question.text) return question.text;
    for (var i = 0; i < BANK.list.length; i += 1) {
      if (BANK.list[i].id === question.id) return BANK.list[i].text;
    }
    return question.id;
  }

  function myAnswer(room) {
    if (!room.tally || !room.tally.voters) return '';
    if (room.tally.voters.O.indexOf(state.clientId) >= 0) return 'O';
    if (room.tally.voters.X.indexOf(state.clientId) >= 0) return 'X';
    return '';
  }

  function renderTally(room) {
    var tally = room.tally || { O: 0, X: 0, voters: { O: [], X: [] } };
    el.tallyOCount.textContent = tally.O;
    el.tallyXCount.textContent = tally.X;
    el.tallyOList.innerHTML = chips(tally.voters ? tally.voters.O : []);
    el.tallyXList.innerHTML = chips(tally.voters ? tally.voters.X : []);
  }

  function chips(ids) {
    var html = '';
    for (var i = 0; i < ids.length; i += 1) {
      var player = playerById(ids[i]);
      if (!player) continue;
      html +=
        '<li class="chip' + (player.id === state.clientId ? ' me' : '') + '">' +
        avatarSvg(player.avatar, 24) +
        '<span class="name">' + escapeHtml(player.nickname) + '</span></li>';
    }
    return html;
  }

  function playerById(id) {
    var players = state.room ? state.room.players : [];
    for (var i = 0; i < players.length; i += 1) {
      if (players[i].id === id) return players[i];
    }
    return null;
  }

  function answer(value) {
    send({ t: 'answer', index: state.room.index, value: value });
  }

  /* ---------- 倒數 ---------- */

  function startCountdown(room, locked) {
    cancelAnimationFrame(state.frame);

    if (locked || !room.remainingMs) {
      el.countdown.textContent = '0';
      el.timerFill.style.width = '0%';
      el.countdown.classList.remove('urgent');
      el.timerFill.classList.remove('urgent');
      return;
    }

    // 換算成本機時刻之後就自己跑，不用每一幀都問伺服器，也不用跟伺服器對時
    state.deadlineAt = Date.now() + room.remainingMs;
    var total = room.remainingMs;

    (function tick() {
      var left = Math.max(0, state.deadlineAt - Date.now());
      el.countdown.textContent = String(Math.ceil(left / 1000));
      el.timerFill.style.width = (left / total) * 100 + '%';

      var urgent = left <= URGENT_MS;
      el.countdown.classList.toggle('urgent', urgent);
      el.timerFill.classList.toggle('urgent', urgent);

      // 歸零之後不自己切畫面：真正的截止由伺服器判斷，等它廣播 reveal 才換
      if (left > 0) state.frame = requestAnimationFrame(tick);
    })();
  }

  /* ---------- 結果 ---------- */

  function renderResults(room) {
    var result = room.result;
    if (!result) return;

    if (!state.resultsReported) {
      track('match_results_shown', { player_count: room.players.length });
      state.resultsReported = true;
    }

    var mine = null;
    for (var i = 0; i < result.groups.length; i += 1) {
      if (result.groups[i].members.indexOf(state.clientId) >= 0) mine = result.groups[i];
    }

    // 主持人不作答時本來就不在任何一組，這張卡直接收起來
    el.myGroupCard.hidden = !mine;
    if (mine) {
      el.myGroupMembers.innerHTML = chips(mine.members);
      el.myGroupTopics.innerHTML = topicList(mine.topics);
      el.myGroupEmpty.hidden = mine.topics.length > 0;
    }

    el.allGroupsHeading.textContent = result.grouped ? t('allGroupsHeading') : t('tooFewToGroup');
    el.allGroups.innerHTML = result.grouped ? groupBlocks(result) : pairList(result.ranking);
  }

  function groupBlocks(result) {
    var html = '';
    for (var i = 0; i < result.groups.length; i += 1) {
      html +=
        '<div class="group-block"><h3>' + escapeHtml(t('groupName', { n: i + 1 })) + '</h3>' +
        '<ul class="chip-list">' + chips(result.groups[i].members) + '</ul>' +
        '<ul class="topic-list">' + topicList(result.groups[i].topics) + '</ul></div>';
    }
    if (result.skipped.length) {
      html += '<p class="hint">' + escapeHtml(t('skippedNote', { n: result.skipped.length })) + '</p>';
    }
    return html;
  }

  function topicList(topics) {
    var html = '';
    for (var i = 0; i < topics.length; i += 1) {
      var topic = topics[i];
      var player = topic.dissenter ? playerById(topic.dissenter) : null;
      html +=
        '<li class="topic"><span class="ox-mark">' + (topic.value === 'O' ? '◯' : '✕') + '</span>' +
        '<span class="text">' + escapeHtml(questionTextById(topic.questionId)) +
        '<span class="note">' +
        escapeHtml(player
          ? t('dissenterNote', { name: player.nickname })
          : t(topic.value === 'O' ? 'topicAgree' : 'topicDisagree')) +
        '</span></span></li>';
    }
    return html;
  }

  function questionTextById(id) {
    for (var i = 0; i < BANK.list.length; i += 1) {
      if (BANK.list[i].id === id) return BANK.list[i].text;
    }
    // 自訂題的文字在房間的題目清單裡
    var questions = state.room && state.room.question ? [state.room.question] : [];
    for (var j = 0; j < questions.length; j += 1) {
      if (questions[j].id === id) return questions[j].text;
    }
    return id;
  }

  function pairList(ranking) {
    var html = '<ul class="pair-list">';
    for (var i = 0; i < ranking.length; i += 1) {
      var row = ranking[i];
      html +=
        '<li>' + chips(row.players).replace(/<li /g, '<span ').replace(/<\/li>/g, '</span>') +
        '<span class="score">' + escapeHtml(t('pairSame', { same: row.same, common: row.common })) +
        '</span></li>';
    }
    return html + '</ul>';
  }

  /* ---------- 分享 ---------- */

  /*
   * 用 location.origin，不要用 CFG.siteOrigin。
   *
   * 寫死正式網域的話，本機與區網測試時手機掃了 QR code 會被送去線上（還沒部署就是 404），
   * 根本測不了多人。用當下的來源則三種情境都對：本機留在 localhost、
   * 區網留在 192.168.x.x、正式站上 location.origin 本來就等於 siteOrigin。
   */
  function shareLink() {
    return location.origin + CFG.base + '/' + CFG.lang + '/?room=' + state.code;
  }

  function renderQr() {
    var url = shareLink();
    // 只在網址變的時候重畫，否則每次廣播主持人畫面都會閃
    if (el.qrBox.dataset.url === url) return;
    el.qrBox.dataset.url = url;

    var qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    el.qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareLink()).then(function () {
      el.copyLink.textContent = t('copiedLabel');
      setTimeout(function () {
        el.copyLink.textContent = t('copyLink');
      }, 1500);
    });
  }

  /* ---------- 離開 ---------- */

  function onKick(event) {
    var button = event.target.closest('[data-kick]');
    if (button) send({ t: 'kick', playerId: button.dataset.kick });
  }

  function confirmExit() {
    var isHost = state.role === 'host';
    el.confirmTitle.textContent = isHost ? t('confirmCloseTitle') : t('confirmLeaveTitle');
    el.confirmDesc.textContent = isHost ? t('confirmCloseDesc') : t('confirmLeaveDesc');
    el.confirmOk.textContent = isHost ? t('confirmCloseOk') : t('confirmLeaveOk');

    el.confirmOk.onclick = function () {
      el.confirmDialog.close();
      state.closing = true;
      send({ t: isHost ? 'close' : 'leave' });
      if (isHost) track('match_room_closed');
      backHome();
    };
    el.confirmDialog.showModal();
  }

  function backHome() {
    location.href = CFG.base + '/' + CFG.lang + '/';
  }

  /* ---------- 畫面切換與小工具 ---------- */

  function showView(name) {
    state.view = name;
    el.viewHome.hidden = name !== 'home';
    el.viewJoin.hidden = name !== 'join';
    el.viewRoom.hidden = name !== 'room';
    el.viewError.hidden = name !== 'error';

    // 四個畫面共用同一個網址，page_view 靠自動送只會記到一筆，
    // 分不出多少人真的開了房間，所以在這裡手動送
    if (window.trackPageView) window.trackPageView(CFG.base + '/' + CFG.lang + '/' + name);
  }

  function showFatal(title, desc) {
    el.errorTitle.textContent = title;
    el.errorDesc.textContent = desc;
    showView('error');
  }

  function showError(node, message) {
    node.textContent = message;
    node.hidden = false;
  }

  function hideError(node) {
    node.hidden = true;
  }

  function showBanner(message) {
    el.connBanner.textContent = message;
    el.connBanner.hidden = false;
  }

  function hideBanner() {
    el.connBanner.hidden = true;
  }

  /*
   * 事件只在「做那個動作的那台裝置」上送。狀態是廣播給全場的，照著狀態送的話，
   * 一場 10 個人的遊戲會把同一個事件記 10 次。前綴一律 match_（阿瓦隆是 avalon_、
   * 搶答是 buzzer_）——整個系列共用一個 GA4 資源，沒有前綴就分不出是哪個遊戲的。
   */
  function track(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params || {});
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
