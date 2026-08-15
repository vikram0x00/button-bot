import { type ErrorHandler } from "grammy";

const errorHandler: ErrorHandler = (error)=>{
	console.log("BOT ERROR", error.message, error.stack);
}

export default errorHandler;