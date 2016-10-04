(function () {
  // Bail if super-old browser
  if (!('querySelector' in document && 'addEventListener' in document)) {
    return;
  }
  var get = function (s) {return document.querySelector.call(document, s);};
  var actx;
  var charCodes = {
    a: '•‒',
    b: '‒•••',
    c: '‒•‒•',
    d: '‒••',
    e: '•',
    f: '••‒•',
    g: '‒‒•',
    h: '••••',
    i: '••',
    j: '•‒‒‒',
    k: '‒•‒',
    l: '•‒••',
    m: '‒‒',
    n: '‒•',
    o: '‒‒‒',
    p: '•‒‒•',
    q: '‒‒•‒',
    r: '•‒•',
    s: '•••',
    t: '‒',
    u: '••‒',
    v: '•••‒',
    w: '•‒‒',
    x: '‒••‒',
    y: '‒•‒‒',
    z: '‒‒••',
    'å': '•‒‒•‒',
    'ä': '•‒•‒',
    'ö': '‒‒‒•',
    1: '•‒‒‒‒',
    2: '••‒‒‒',
    3: '•••‒‒',
    4: '••••‒',
    5: '•••••',
    6: '‒••••',
    7: '‒‒•••',
    8: '‒‒‒••',
    9: '‒‒‒‒•',
    0: '‒‒‒‒‒',
    '.': '•‒•‒•‒',
    ',': '‒‒••‒‒',
    ':': '‒‒•••',
    '?': '••‒‒••',
    '!': '••‒‒•',
    '’': '•‒‒‒‒•',
    '—': '‒••••‒',
    '–': '‒••••‒',
    '-': '‒••••‒',
    '/': '‒••‒•',
    '(': '‒•‒‒•‒',
    ')': '‒•‒‒•‒',
    '”': '•‒••‒•',
    '"': '•‒••‒•',
    '“': '•‒••‒•',
    '@': '•‒‒•‒•'
  };

  // iOS Audio unlock function, from https://github.com/parasyte/howler.js/blob/e8dc41ce498f28cdf1c1de631b597f5d719fe42b/src/howler.core.js
  var _iOSEnabled = false;

  // Call this method on touch start to create and play a buffer,
  // then check if the audio actually played to determine if
  // audio has now been unlocked on iOS.
  var unlock = function() {
    // Create an empty buffer.
    var buffer = actx.createBuffer(1, 1, 22050);
    var source = actx.createBufferSource();
    source.buffer = buffer;
    source.connect(actx.destination);

    // Play the empty buffer.
    if (typeof source.start === 'undefined') {
      source.noteOn(0);
    } else {
      source.start(0);
    }

    // Setup a timeout to check that we are unlocked on the next event loop.
    setTimeout(function() {
      if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
        // Update the unlocked state and prevent this check from happening again.
        _iOSEnabled = true;
        // Remove the touch start listener.
        document.removeEventListener('touchend', unlock, false);
      }
    }, 0);
  };


  function start(actx) {
    var osc = actx.createOscillator();
        out = actx.createGain();
    if ('start' in osc) {
      // Standard Audio API method.
      osc.start(0);
    } else if ('noteOn' in osc) {
      // Older WebKit stuffs.
      osc.noteOn(0);
    }
    
    out.gain.value = 0;
    osc.connect(out);
    out.connect(actx.destination);
    return out;
  }
  // Beeps are made raising the volume, to avoid some glitchy
  // digital distiortion when toggling on/off.
  // Takes a parameter for how long to beep.
  function beep(out, t) {
    out.gain.value = 1;
    setTimeout(function () {
      out.gain.value = 0;
    }, t)
  }
  
  function setUpMorse() {
    var text = document.title + ' '+document.body.innerText;
    var morse = "";

    for (var i = 0, len = text.length; i < len; i++) {
      // If it's a character we can translate, start building the morse string.
      if (!/\s/.test(text[i])) {
        morse  += ' ' + (charCodes[text[i].toLowerCase()] || '');
      } else {
        // unrecognized chars just become a longer pause.
        morse += '  ';
      }
    }
    // Append that text to the holder.
    // holder.innerText = morse;
    return morse;
  }

  function setUpCheatLink() {
    var root = document.createElement('div');
    var tpl = get('#cheatlink');
    root.innerHTML = tpl.innerHTML;
    get('.wrap').appendChild(root);
  }

  function setUpButtons() {
    var root = document.createElement('ul');
    var tpl = get('#buttons').innerHTML;
    var ctrls = get('#controls');
    ctrls.innerHTML = tpl + ctrls.innerHTML;
  }

  

  // OK, let's get this Audio show on the road:
  var sequence,
      isPlaying = false; // ”global” player state.

  // This is the loop that is going when playing:
  function tick(out, str, idx, pause) {
    isPlaying = true;
    var l = 100, // length of beep
        isPause = !!pause;
    if (idx < str.length) {
      // These next parts determine the morse tempo (sound vs pause), based 
      // on highly scientific studies of morse code tempo from the Internetz.
      if (str[idx] === '•') {
        beep(out, 50);
      } else if (str[idx] === '‒') {
        beep(out, 150);
        l = 200;
      } else {
        if (isPause) {
          l = 200;
        } else {
          isPause = true;
          l = 150;
        }
      }
      sequence = setTimeout(function () {
        // recursively tick again
        tick(out, str, idx+1, isPause);
      }, l);
    }
  }

  var holder = get('#hold-the-telegraph');
  var morse = holder.innerText = setUpMorse();
  setUpCheatLink();

  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    var player = start(actx);
    setUpButtons();
    get('#stop').addEventListener('click', function () {
      player.gain.value = 0;
      clearTimeout(sequence);
      isPlaying = false;
    }, false);

    get('#play').addEventListener('click', function () {
      if (!isPlaying) {
        tick(player, morse, 0);
      }
    }, false);
    // Hackish: Interaction is required before Safari iOS lets
    // you use the Audio API.
    document.addEventListener('touchend', unlock, false);
  }
  
}());