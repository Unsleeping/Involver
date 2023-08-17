class Logger {
  constructor(isTestMode) {
    this._isTestMode = isTestMode;
  }

  log(...message) {
    if (this._isTestMode) {
      console.log(...message);
    }
  }
}

class InteractionDebugger {
  constructor(document, isTestMode) {
    this._document = document;
    this._isTestMode = isTestMode;
    this._dialogInterval = null;
    this._resumeCallback = null;
    this._dialogElement = null;
  }

  _closeDialogAndResetInterval() {
    this._dialogElement.close();
    clearInterval(this._dialogInterval);
    if (this._resumeCallback) {
      this._resumeCallback();
    }
  }

  _openImagePreviewDialog(imageSrc) {
    if (this._dialogElement) {
      const previewImage = this._dialogElement.querySelector("#previewImage");
      previewImage.src = imageSrc;
      previewImage.style.width = "300px";
      previewImage.style.height = "300px";
      this._dialogElement.showModal();

      this._dialogInterval = setInterval(() => {
        this._closeDialogAndResetInterval();
      }, 2000);

      const closeDialogButton = this._document.getElementById("closeDialog");
      closeDialogButton.addEventListener("click", () => {
        dialog.close();
      });
    }
  }

  visualize(image, resumeCallback) {
    this._resumeCallback = resumeCallback;
    const imageSrc = image.src;
    this._openImagePreviewDialog(imageSrc);
  }

  _createDialogElement() {
    const dialogElement = this._document.createElement("dialog");
    dialogElement.id = "imagePreviewDialog";
    const dialogImage = this._document.createElement("img");
    dialogImage.id = "previewImage";
    dialogImage.alt = "preview";
    dialogImage.src = "";
    const dialogButton = this._document.createElement("button");
    dialogButton.id = "closeDialog";
    dialogButton.textContent = "Close";
    dialogElement.appendChild(dialogImage);
    dialogElement.appendChild(dialogButton);
    return dialogElement;
  }

  _invokeDialog() {
    this._dialogElement = this._createDialogElement();
    this._document.body.appendChild(this._dialogElement);
  }

  init() {
    if (this._isTestMode) {
      this._invokeDialog();
    }
  }
}

class Finder {
  constructor(document, window, isTestMode) {
    this._document = document;
    this._window = window;
    this._isTestMode = isTestMode;
    this.logger = new Logger(isTestMode);
  }

  _isElementPartiallyInViewport(el, visibilityThreshold = 0.6) {
    const rect = el.getBoundingClientRect();
    const windowHeight =
      this._window.innerHeight || this._document.documentElement.clientHeight;
    const elementHeight = rect.height;
    const threshold = visibilityThreshold * elementHeight;

    return rect.bottom >= threshold && rect.top <= windowHeight - threshold;
  }

  findMarkdownBlock(selector, blockName) {
    const blockElements = this._document.querySelectorAll(selector);
    for (const blockElement of blockElements) {
      if (this._isElementPartiallyInViewport(blockElement)) {
        this.logger.log(`??? ${blockName} found >>>`);
        return blockElement;
      }
    }

    this.logger.log(`??? no ${blockName} found >>>`);
  }
}

class MarkdownRuler extends Finder {
  constructor(...options) {
    super(...options);
    this._imageSelector = ".article-image-item__image";
    this._textBlockSelector = "p.article-render__block";
  }

  findTextBlock() {
    return super.findMarkdownBlock(this._textBlockSelector, "text block");
  }

  findImage() {
    return super.findMarkdownBlock(this._imageSelector, "image");
  }
}

class Involver extends MarkdownRuler {
  constructor(document, window, isTestMode) {
    super(document, window, isTestMode);
    this._document = document;
    this._window = window;
    this._isTestMode = isTestMode;
    this._step = getRandom(200, 400);
    this._sleepDelay = getRandomDelay();
    this._stepCounter = 1;
    this._scrollTime = getRandomTime();
    this._paused = false;
    this._interval = null;
    this._hasQueued = false;
    this.observingCounter = 0;
    this.logger = new Logger(isTestMode);
    this._debugger = new InteractionDebugger(document, isTestMode);
  }

  pause(reason = "pausing") {
    this.logger.log(reason);
    this._paused = true;
  }

  resume(reason = "resuming") {
    this.logger.log(reason);
    this._paused = false;
  }

  _simulateUserTextInteraction(textBlock) {
    return new Promise((resolve) => {
      this.logger.log("simulating text block interaction on", textBlock);
      if (this._isTestMode) {
        const selection = this._window.getSelection();
        selection.removeAllRanges();

        const range = this._document.createRange();
        range.selectNodeContents(textBlock);
        selection.addRange(range);
        this._sleep(2000).then(() => {
          this.logger.log(
            "finished simulating text block interaction on",
            textBlock
          );
          selection.removeAllRanges();
          resolve();
        });
      }
    });
  }

  _sleep(delay = this._sleepDelay) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  _simulateUserImageInteraction(image) {
    return new Promise((resolve) => {
      this.logger.log("simulating image interaction on", image);
      if (this._isTestMode) {
        this.pause("pausing while visualizing image in test mode");
        this._debugger.visualize(image, () => {
          this.resume("resuming after visualizing complete");
          resolve();
        });
      } else {
        this.pause("pausing while opening image");
        image.click();
        this._sleep(2000).then(() => {
          this.resume("resuming after clicking on image");
          resolve();
        });
      }
    });
  }

  _isScrollAtPageEnd() {
    const scrollPosition = this._window.scrollY || this._window.pageYOffset;
    const windowHeight =
      this._window.innerHeight || this._document.documentElement.clientHeight;
    const totalHeight = this._document.documentElement.scrollHeight;

    return scrollPosition + windowHeight >= totalHeight;
  }

  _increaseScrollPosition() {
    this.logger.log(
      "Increasing scroll position",
      this._step * (this._stepCounter + 1)
    );
    this._window.scroll({
      top: this._step * this._stepCounter++,
      behavior: "smooth",
    });
  }

  async _checkViewport() {
    this._hasQueued = true;
    this.logger.log("#%@ Involver is checking viewport *#%*&");
    const textBlock = super.findTextBlock();
    const image = super.findImage();
    if (textBlock && image) {
      await this._simulateUserTextInteraction(textBlock);
      await this._simulateUserImageInteraction(image);
    } else if (textBlock && !image) {
      await this._simulateUserTextInteraction(textBlock);
    } else if (!textBlock && image) {
      await this._simulateUserImageInteraction(image);
    }

    if (this._isScrollAtPageEnd()) {
      this.logger.log("reached end of page");
      return;
    }
    this._increaseScrollPosition();
    this._hasQueued = false;
  }

  async _observe() {
    if (this._hasQueued) {
      this.logger.log("#%@ observe interrupted, Involver is queued *#%*&");
      return;
    }
    if (this._paused) {
      this.logger.log("#%@ observe interrupted, Involver is paused *#%*&");
      return;
    }
    console.group("#%@ Involver is observing *#%*&");
    this.pause("pausing while observing");
    await this._checkViewport();
    if (!this._isScrollAtPageEnd()) {
      this.resume("resumed after observing complete");
    }
    console.groupEnd();
  }

  _setInterval() {
    this._interval = setInterval(() => {
      this._observe();
    }, this._scrollTime);
  }

  _startInvolving() {
    this._setInterval();
  }

  init() {
    this.logger.log("#%@ Involver inited *#%*&");
    this._startInvolving();
    this._debugger.init();
  }

  destroy() {
    this.logger.log("#%@ Involver destroyed *#%*&");
    clearInterval(this._interval);
  }
}

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const isTestMode = window.location.hash.includes("test");
const getRandomTime = () =>
  isTestMode ? getRandom(1000, 2000) : getRandom(6000, 8000);
const getRandomDelay = () =>
  isTestMode ? getRandom(1000, 2000) : getRandom(4000, 6000);
const getStep = () => getRandom(200, 400);

document.addEventListener("DOMContentLoaded", () => {
  const scroller = new Involver(document, window, isTestMode);
  scroller.init();
  window.addEventListener("click", () => {
    scroller.destroy();
  });
});
