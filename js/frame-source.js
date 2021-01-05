'use strict';

const IMG_WIDTH = 1920;
const IMG_HEIGHT = 1080;

function _imageDataWithText(text) {
    const canvas = new OffscreenCanvas(IMG_WIDTH, IMG_HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT);

    ctx.font = '148px serif';
    ctx.fillStyle = 'black';
    ctx.fillText(text, 10, 150);

    ctx.fillText(`${IMG_WIDTH} x ${IMG_HEIGHT}`, 10, 450);
    return ctx.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT);
}

var _imageDataCounter = 0;
var _imageDataList = [];

function _generateImageDataSet() {
    for (var i = 0; i < 30; ++i) {
        _imageDataList.push(_imageDataWithText(`Frame #${i+1}/30`));
    }
    console.log(_imageDataList);
}

_generateImageDataSet();

function getNextImageData() {
    if (_imageDataCounter >= _imageDataList.length) { _imageDataCounter = 0; }
    const result = _imageDataList[_imageDataCounter];
    _imageDataCounter++;
    return result;
}

async function getNextVideoFrame() {
    const bitmap = await createImageBitmap(getNextImageData());
    const result = new VideoFrame(bitmap, {timestamp: null});
    bitmap.close();
    return result;
}

function createCanvasStream(framerate) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frameInterval = Math.floor(1000 / framerate);
    const result = canvas.captureStream();
    const track = result.getVideoTracks()[0];

    const queueFrame = () => {
        const captureStarted = Date.now();
        const imageData = getNextImageData();
        if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
            canvas.width = imageData.width;
            canvas.height = imageData.height;
        }
        ctx.putImageData(imageData, 0, 0);

        if ('live' !== track.readyState) {
            return;
        }

        const captureInterval = Date.now() - captureStarted;
        let pauseInterval = frameInterval - captureInterval;
        if (pauseInterval < 0) {
            setTimeout(queueFrame, 0);
            console.error(`Can't deliver frame in time`);
        } else {
            setTimeout(queueFrame, pauseInterval);
        }
    };
    queueFrame();
    return result;
}

function createGeneratorStream(framerate) {
    let generator;
    try {
      generator = new MediaStreamTrackGenerator('video');
    } catch (e) {
      alert(`MediaStreamTrackGenerator failed: ${e}`);
      throw e;
    }

    const sink = generator.writable;
    const writer = sink.getWriter();

    var closed = false;
    writer.closed.then(() => {
        console.log(`* * * CLOSED by writer`);
        closed = true;
    });

    generator.addEventListener('ended', () => {
        console.log(`* * * CLOSED by track`);
        closed = true;
    });

    const enqueueFrameWhenReady = async () => {
        await writer.ready;
        const frame = await getNextVideoFrame();
        if ('live' === generator.readyState) {
            return writer.write(frame);
        } else {
            frame.destroy();
            throw new Error("track is ended");
        }
    };

    const frameInterval = Math.floor(1000 / framerate);

    const queueFrame = () => {
      const captureStarted = Date.now();
      enqueueFrameWhenReady().then(_ => {
        const captureInterval = Date.now() - captureStarted;
        if (closed) {
          return;
        }

        let pauseInterval = frameInterval - captureInterval;
        if (pauseInterval < 0) {
          setTimeout(queueFrame, 0);
          console.error(`Can't deliver frame in time`);
        } else {
          setTimeout(queueFrame, pauseInterval);
        }
      },
      reason => {
        closed = true;
        console.log(`* * * CLOSED by underlying sink: ${reason}`);
      });
    };
    queueFrame();

    const result = new MediaStream();
    result.addTrack(generator);
    return result;
}