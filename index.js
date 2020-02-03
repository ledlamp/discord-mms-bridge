require("dotenv").config();
var Discord = require("discord.js");
var MailInterface = require("./mailinterface");

var dc = new Discord.Client();
dc.login(process.env.TOKEN);

var mint = new MailInterface({
	mbox: process.env.MBOX,
	smtp: {
		host: process.env.SMTP_HOST || "localhost",
		port: process.env.SMTP_PORT || 25,
		hostname: process.env.SMTP_HOSTNAME,
		from: process.env.SMTP_FROM
	},
	target: process.env.TARGET_EMAIL
});


// discord to mms
dc.on("message", async function(message){
    if (message.channel.id == process.env.DISCORD_CHANNEL_ID) {
        await mint.send(`${message.author.tag}: ${message.cleanContent}`); //TODO attachment support
    }
});

// mms to discord
mint.on("mail", async function(mail){
		if (mail.from.text != process.env.TARGET_EMAIL) {
			require('fs').appendFileSync("unknown_emails.txt", JSON.stringify(mail, null, 4) + '\n\n\n\n');
			return;
		};
		var textAttachment = mail.attachments.find(a => a.filename == "text_0.txt");
		var msg = mail.text || textAttachment.content || mail.html || "<missing message>";
		if (mail.subject) msg = `**${mail.subject}**\n${msg}`;
		await dc.channels.get(process.env.DISCORD_CHANNEL_ID).send(msg, {
			split: {char:'', maxLength:2000},
			attachments: mail.attachments.filter(a => a.filename != "text_0.txt")
		});
});