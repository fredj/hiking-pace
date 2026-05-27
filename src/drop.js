const cancel = (event) => event.preventDefault();

export function init(dest, fn) {
  const dropzone = document.querySelector(dest);
  const container = document.querySelector('#chart-container');

  container.addEventListener('dragover', (event) => {
    cancel(event);
    container.classList.add('dragover');
  }, false);

  container.addEventListener('dragleave', () => {
    container.classList.remove('dragover');
  }, false);

  dropzone.addEventListener('dragenter', cancel, false);

  container.addEventListener('drop', (event) => {
    cancel(event);
    container.classList.remove('dragover');
    container.classList.add('has-data');

    for (const file of event.dataTransfer.files) {
      const reader = new FileReader();
      reader.onload = () => {
        fn(reader.result);
      };
      reader.readAsText(file);
    }
  }, false);
}
