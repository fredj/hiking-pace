const cancel = (event) => event.preventDefault();

export function init(dest, fn) {
  const dropzone = document.querySelector(dest);

  dropzone.addEventListener('dragover', cancel, false);
  dropzone.addEventListener('dragenter', cancel, false);
  
  dropzone.addEventListener('drop', (event) => {
    cancel(event);

    for (let file of event.dataTransfer.files) {
      const reader = new FileReader();
      reader.onload = () => {
        fn(reader.result);
      };
      reader.readAsText(file);
    }
  }, false);
}


