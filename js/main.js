'use strict';

if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined') {
  alert(
      'Your browser does not support the experimental MediaStreamTrack API ' +
      'for Insertable Streams of Media. See the note at the bottom of the ' +
      'page.');
}

function initUI() {
  const FRAMERATE = 30;

  const renderToVidelElement = (stream) => {
    const videoEl = document.getElementById('video-sink');
    videoEl.pause();
    videoEl.srcObject = null;
    videoEl.srcObject = stream;
    videoEl.play();
  }

  document.getElementById('stop-btn').onclick = () => {
    const videoEl = document.getElementById('video-sink');
    videoEl.pause();
    const stream = videoEl.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    videoEl.srcObject = null;
  }

  document.getElementById('canvas-stream-btn').onclick = () => {
    renderToVidelElement(createCanvasStream(FRAMERATE));
  };

  document.getElementById('generator-stream-btn').onclick = () => {
    renderToVidelElement(createGeneratorStream(FRAMERATE));
  };
}

window.onload = initUI;
