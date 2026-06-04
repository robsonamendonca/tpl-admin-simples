package com.monitor.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        // Verificar se o uso do aplicativo está liberado
        val prefs = context.getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
        val isAuthorized = prefs.getBoolean("is_authorized", false)
        
        if (!isAuthorized) {
            Log.d("SmsReceiver", "Monitoramento bloqueado: Usuário não autorizado.")
            return
        }

        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val smsMessages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (message in smsMessages) {
                val sender = message.displayOriginatingAddress ?: "Desconhecido"
                val body = message.displayMessageBody ?: ""
                
                Log.d("SmsReceiver", "SMS Recebido de: $sender, Mensagem: $body")
                
                // Salvar nos SharedPreferences
                val prefs = context.getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
                val count = prefs.getInt("sms_count", 0) + 1
                prefs.edit()
                    .putInt("sms_count", count)
                    .putString("last_sms_sender", sender)
                    .putString("last_sms_body", body)
                    .apply()

                // Atualizar UI caso esteja aberta
                val updateIntent = Intent("com.monitor.sms.UPDATE_LOG")
                context.sendBroadcast(updateIntent)

                // Enviar para a API em uma thread separada para nao travar o receiver
                thread {
                    sendToApi(context, sender, body)
                }
            }
        }
    }

    private fun sendToApi(context: Context, sender: String, body: String) {
        try {
            val prefs = context.getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
            val deviceId = prefs.getString("device_id", null)
            val accessToken = prefs.getString("access_token", null)

            val url = URL("https://hdev.com.br/app/mock-api/index.php?action=ingest_sms")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            if (!accessToken.isNullOrEmpty()) {
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
            }
            connection.doOutput = true

            val safeBody = body.replace("\"", "\\\"")
            val jsonInputString = if (!deviceId.isNullOrEmpty()) {
                "{\"deviceId\": \"$deviceId\", \"remetente\": \"$sender\", \"mensagem\": \"$safeBody\"}"
            } else {
                "{\"remetente\": \"$sender\", \"mensagem\": \"$safeBody\"}"
            }

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(jsonInputString)
                writer.flush()
            }

            val responseCode = connection.responseCode
            Log.d("SmsReceiver", "Resposta da API: $responseCode")

        } catch (e: Exception) {
            Log.e("SmsReceiver", "Erro ao enviar SMS para API", e)
        }
    }
}
