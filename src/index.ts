import { Bot, Context, session, type SessionFlavor } from "grammy";
import { config } from "dotenv";
import { styleText } from "node:util";
import errorHandler from "./errorHandler.ts";

config();

interface SessionData {
	state: "awaiting_link" | "awaiting_buttons_data";
	chatId: number | string | undefined;
	messageId: number | undefined;
	parsedButtons?: any | undefined;
}

type BotContext = Context & SessionFlavor<SessionData>;

const initial = ()=>{
	return { state: "awaiting_link" }
}

const parseButtons = (rawStr: string[])=>{
	rawStr.forEach(e => {
		const index = e.indexOf(":");
		if(!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(e.slice(index))){
			throw Error("Invalid URLs Found in Buttons");
		}
	});
	return rawStr.map(e => [{ text: e.split(":")[0], url: e.slice(e.indexOf(":") + 1) }]);
}

const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial }));

bot.command("start", async (ctx)=>{
	await ctx.reply("Hello");
});

bot.command("cancel", async (ctx)=>{
	if(!ctx.session.chatId || !ctx.session.messageId){
		await ctx.reply("No Operation is being carried out. Nothing to cancel");
		return;
	}
	await ctx.reply("Operation Cancelled!");
	ctx.session.state = "awaiting_link";
});

bot.callbackQuery("remove", async (ctx)=>{
	await ctx.answerCallbackQuery();
	await ctx.editMessageReplyMarkup({
		reply_markup: {
			inline_keyboard: []
		}
	});
	await bot.api.editMessageReplyMarkup(ctx.session.chatId!, ctx.session.messageId!, {
		reply_markup: {
			inline_keyboard: []
		}
	});
	await ctx.reply("Successfully Removed Buttons");
	ctx.session = { state: "awaiting_link", chatId: undefined, messageId: undefined }
});

bot.callbackQuery("submit", async (ctx)=>{
	await ctx.answerCallbackQuery();
	await ctx.editMessageReplyMarkup({
		reply_markup: {
			inline_keyboard: []
		}
	});
	await bot.api.editMessageReplyMarkup(ctx.session.chatId!, ctx.session.messageId!, {
		reply_markup: {
			inline_keyboard: ctx.session.parsedButtons
		}
	});
	await ctx.reply("Buttons Edited Successfully");
	ctx.session = { state: "awaiting_link", chatId: undefined, messageId: undefined, parsedButtons: undefined };
});

bot.on("message:text", async (ctx)=>{
	/**
	 * Step 1 - User Sends a Telegram Message Link to the Bot
	 * Step 2 - Verify if it is a Telegram Link -- Proceed if, Return if not, Set Session State to await
	 * Step 3 - Ask for the Buttons in the specific format [text]:[url]
	 * Step 4 - Verify Format -- Proceed if correct, Error if not
	 * Step 5 - Execute editMessage Method on the provided Chat ID and Message ID
	 * Step 6 - If there is an Error of permission etc., Send it back to the User, Empty the session
	 */
	const messageText = ctx.message.text;
	if(ctx.session.state === "awaiting_link"){
		if(!messageText.startsWith("https://t.me/c/") || !messageText.startsWith("https://t.me/")){
			await ctx.reply("Invalid Message Link Sent");
			return;
		}
		const arr = messageText.split("/");
		await ctx.reply("Great! Please Send your Buttons in a Format like this\n\nExample:\n<code>Button 1:https://google.com</code>\n<code>Button 2:https://reddit.com</code>", {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[{ text: "Remove Existing Buttons", callback_data: "remove" }]
				]
			}
		});
		if(messageText.startsWith("https://t.me/c/")){
			ctx.session = { state: "awaiting_buttons_data", chatId: "-100" + arr[4], messageId: Number(arr[5]) }
		}
		else if(messageText.startsWith("https://t.me/")){
			ctx.session = { state: "awaiting_buttons_data", chatId: arr[3], messageId: Number(arr[4]) }
		}
	}
	else if(ctx.session.state === "awaiting_buttons_data"){
		if(ctx.message.text.startsWith("https://t.me/")){
			await ctx.reply("There is an operation running. Please /cancel it or send the buttons in the required format.");
			return;
		}
		const buttons = ctx.message.text.split("\n");
		let parsedBtns;
		try {
			parsedBtns = parseButtons(buttons);
		} catch (error: any) {
			await ctx.reply(error.message);
			return;
		}
		await ctx.reply("Here is a Preview of your button(s):", {
			reply_markup: {
				// @ts-ignore
				inline_keyboard: parsedBtns.concat([[{ text: "Submit", callback_data: "submit" }]])
			}
		});
		ctx.session.parsedButtons = parsedBtns;
	}
});

bot.start();

bot.catch(errorHandler);

console.clear();
console.log(styleText("green", "•"), "Bot is running");