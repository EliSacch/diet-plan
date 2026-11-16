// jsdom does not implement the modal dialog API.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false;
};
