
document.getElementById('fileChooser').addEventListener('change', doit, false);​
function doit(e) {
  var files = e.target.files;
  var reader = new FileReader();
  reader.onload = function() {
    var parsed = new DOMParser().parseFromString(this.result, "text/xml");
    console.log(parsed);
  };
  reader.readAsText(files[0]);
}
