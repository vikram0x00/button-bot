import { type ErrorHandler } from "grammy";

const errorHandler: ErrorHandler = async (error)=>{
	if(error.message === `GrammyError in middleware: Call to 'editMessageReplyMarkup' failed! (400: Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message)`){
		await error.ctx.reply("No Inline Buttons found in the given message");
	}
	else if(error.message === `GrammyError in middleware: Call to 'editMessageReplyMarkup' failed! (400: Bad Request: MESSAGE_ID_INVALID)`){
		await error.ctx.reply("The Message with the provided message identifier not found in the provided chat.");
	}
	else if(error.message === `GrammyError in middleware: Call to 'editMessageReplyMarkup' failed! (400: Bad Request: message identifier is not specified)`){
		await error.ctx.reply("The Message with the provided message identifier not found in the provided chat. \nOther reasons might be that there are no inline buttons on the message provided");
	}
	console.log(error.message);
}

export default errorHandler;