require("dotenv").config();
var Discord = require("discord.js");
var MailInterface = require("./mailinterface");

var dc = new Discord.Client();
dc.login(process.env.DISCORD_TOKEN).then(() => { console.log("Logged in to Discord") });

var mint = new MailInterface({
	mbox: process.env.MBOX,
	nodemailer: {
		options: process.env.SMTP_URI,
		defaults: {
			from: process.env.MAIL_FROM,
			to: process.env.MAIL_TO
		}
	},
});

// discord to mms
dc.on("message", async function(message){
    if (message.channel.id == process.env.DISCORD_CHANNEL_ID) {
		try {
			await mint.send({
				subject: message.author.tag,
				body: message.cleanContent,
				attachments: message.attachments.map(attachment => ({
					filename: attachment.filename,
					href: attachment.url
				}))
			});
		} catch(error) {
			console.error(error);
			await message.react('⚠');
		}
    }
});

// mms to discord
mint.on("mail", async function(mail){
		if (mail.from.text != process.env.TARGET_EMAIL) {
			require('fs').appendFileSync("unknown_emails.txt", JSON.stringify(mail, null, 4) + '\n\n\n\n');
			return;
		}
		var textAttachment = mail.attachments.find(a => a.filename == "text_0.txt");
		var msg = mail.text || textAttachment.content || mail.html || "<missing message>";
		if (mail.subject) msg = `**${mail.subject}**\n${msg}`;
		try {
			await dc.channels.get(process.env.DISCORD_CHANNEL_ID).send(msg, {
				split: {char:'', maxLength:2000},
				attachments: mail.attachments.filter(a => a.filename != "text_0.txt")
			});
		} catch (error) {
			await mint.send({subject: "Error", body: error.message});
		}
});
