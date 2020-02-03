var {EventEmitter} = require("events");
var fs = require("fs");
var Mbox = require("node-mbox");
var {simpleParser} = require("mailparser");
var nodemailer = require("nodemailer");

class MailInterface extends EventEmitter {
	
	constructor(options) { super();
		this.mbox = options.mbox || `/var/mail/${require('os').getUser().username}`;
		fs.watch(this.mbox, eventType => {
			if (eventType == "change") this.check();
		});
		this.transporter = nodemailer.createTransport(options.nodemailer.options, options.nodemailer.defaults);
		this.transporter.verify((error, success) => {
			error ? console.error(error) : console.log("SMTP connection verified", success);
		});
		this.send = this.transporter.sendMail;
	}
	
	check() {
		console.log("checking mail");
		if (fs.statSync(this.mbox).size == 0) return console.log("no mail");
		var mbox = new Mbox(this.mbox);
		mbox.on("message", msg => {
			simpleParser(msg).then(parsedMail => {
				console.log("parsed mail:\n", parsedMail);
				this.emit("mail", parsedMail);
			});
		});
		mbox.on("error", console.error);
		mbox.on("end", () => {
			console.log("finished loading mail");
			fs.writeFileSync(this.mbox, '');
		});
	}
	
}

module.exports = MailInterface;

