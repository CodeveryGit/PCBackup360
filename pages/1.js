const { ipcRenderer } = require("electron");
var hostname = document.querySelector("#hostname");

ipcRenderer.on("hostname", function (event, arg) {
	localStorage["hostname"] = arg;
});

function set_validation_message(event)
{
	var message = this.parentNode.querySelector(".error-message");
	if (event.type == "invalid" || event.type == "change" && message.innerHTML.length > 0)
		message.innerHTML = this.validationMessage;
}

document.addEventListener("DOMContentLoaded", function (event) {
	var form = document.querySelector("#userdata");

	form.addEventListener("submit", function (event) {
		event.preventDefault();
		localStorage["email"] = this.elements["email"].value;
		navigator.sendBeacon("https://a.sddse.com/pcbackup-registration/v2/email.php", new FormData(this));
		location.pathname = "/page2.html";
	});

	for (var i = 0; i < form.elements.length; i++)
	{
		form.elements[i].addEventListener("invalid", set_validation_message);
		form.elements[i].addEventListener("change", set_validation_message);
	}
});