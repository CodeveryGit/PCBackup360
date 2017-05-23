document.addEventListener("DOMContentLoaded", function (event) {
	document.querySelector("#next-button").href += localStorage["email"];
});