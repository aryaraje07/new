//quiz related 

import axios from "axios"

export const geminiQuizClient = axios.create({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
})

