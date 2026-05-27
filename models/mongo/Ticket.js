const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const TicketSchema = new Schema(
  {
    name: { type: String, default: "Guest" },
    email: { type: String, index: true },
    title:String,
    description:String,
    reply:String,
    Status:{ type: String,enum:["OPEN" , "CLOSE"] , default:"OPEN" },
    type:{ type: String,enum:["USER" , "DRIVER"] },
    image:String

  },
  {
    strict: "throw", // Add this to enable strict type validation
    timestamps: true,
  }
);








module.exports = mongoose.model("Tickat", TicketSchema);

