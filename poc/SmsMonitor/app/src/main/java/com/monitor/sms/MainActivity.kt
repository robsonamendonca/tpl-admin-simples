package com.monitor.sms

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter

import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import com.microsoft.identity.client.*
import com.microsoft.identity.client.exception.MsalException

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private val SMS_PERMISSION_CODE = 100
    private lateinit var logText: TextView
    private lateinit var statusText: TextView
    private lateinit var errorText: TextView
    private lateinit var loginButton: Button
    private lateinit var logoutButton: Button
    private lateinit var monitorLayout: LinearLayout

    private var mSingleAccountApp: ISingleAccountPublicClientApplication? = null

    private val updateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            updateLogText()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        logText = findViewById(R.id.logText)
        errorText = findViewById(R.id.errorText)
        loginButton = findViewById(R.id.loginButton)
        logoutButton = findViewById(R.id.logoutButton)
        monitorLayout = findViewById(R.id.monitorLayout)

        loginButton.setOnClickListener { signIn() }
        logoutButton.setOnClickListener { signOut() }

        // Inicializar MSAL
        PublicClientApplication.createSingleAccountPublicClientApplication(
            this,
            R.raw.auth_config,
            object : IPublicClientApplication.ISingleAccountApplicationCreatedListener {
                override fun onCreated(application: ISingleAccountPublicClientApplication) {
                    mSingleAccountApp = application
                    loadAccount()
                }

                override fun onError(exception: MsalException) {
                    Toast.makeText(this@MainActivity, "Erro MSAL: ${exception.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun loadAccount() {
        mSingleAccountApp?.getCurrentAccountAsync(object : ISingleAccountPublicClientApplication.CurrentAccountCallback {
            override fun onAccountLoaded(activeAccount: IAccount?) {
                updateUI(activeAccount)
            }

            override fun onAccountChanged(priorAccount: IAccount?, currentAccount: IAccount?) {
                updateUI(currentAccount)
            }

            override fun onError(exception: MsalException) {
                Toast.makeText(this@MainActivity, "Erro ao carregar conta: ${exception.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun signIn() {
        mSingleAccountApp?.signIn(this, null, arrayOf("user.read"), object : AuthenticationCallback {
            override fun onSuccess(authenticationResult: IAuthenticationResult) {
                updateUI(authenticationResult.account)
                // Registrar dispositivo no backend utilizando o access token retornado
                try {
                    val accessToken = authenticationResult.accessToken
                    // Salvar token temporariamente para uso no envio de SMS
                    val prefs = getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("access_token", accessToken).apply()

                    registerDevice(accessToken)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Erro ao obter token: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onError(exception: MsalException) {
                Toast.makeText(this@MainActivity, "Falha no Login: ${exception.message}", Toast.LENGTH_SHORT).show()
            }

            override fun onCancel() {
                Toast.makeText(this@MainActivity, "Login Cancelado", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun registerDevice(accessToken: String) {
        thread {
            try {
                val url = URL("https://hdev.com.br/app/mock-api/index.php?action=register_device")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
                connection.doOutput = true

                val deviceInfo = "{\"model\":\"${android.os.Build.MODEL}\",\"manufacturer\":\"${android.os.Build.MANUFACTURER}\",\"androidVersion\":\"${android.os.Build.VERSION.RELEASE}\"}"
                val jsonInputString = "{\"id_token\": \"${accessToken.replace("\"","\\\"")}\", \"deviceInfo\": $deviceInfo}"

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(jsonInputString)
                    writer.flush()
                }

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val responseStream = connection.inputStream.bufferedReader().use { it.readText() }
                    val deviceIdRegex = "\"deviceId\"\\s*:\\s*\"([^\"]+)\"".toRegex()
                    val statusRegex = "\"status\"\\s*:\\s*\"([^\"]+)\"".toRegex()
                    val deviceIdMatch = deviceIdRegex.find(responseStream)
                    val statusMatch = statusRegex.find(responseStream)
                    if (deviceIdMatch != null) {
                        val deviceId = deviceIdMatch.groupValues[1]
                        val prefs = getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
                        prefs.edit().putString("device_id", deviceId).apply()
                        if (statusMatch != null && statusMatch.groupValues[1] == "ACTIVE") {
                            setAuthorized(true)
                        } else {
                            setAuthorized(false)
                        }
                        runOnUiThread { Toast.makeText(this@MainActivity, "Dispositivo registrado: $deviceId", Toast.LENGTH_SHORT).show() }
                    }
                } else {
                    runOnUiThread { Toast.makeText(this@MainActivity, "Falha ao registrar dispositivo: $responseCode", Toast.LENGTH_SHORT).show() }
                }

            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Erro ao registrar dispositivo: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun signOut() {
        mSingleAccountApp?.signOut(object : ISingleAccountPublicClientApplication.SignOutCallback {
            override fun onSignOut() {
                updateUI(null)
            }

            override fun onError(exception: MsalException) {
                Toast.makeText(this@MainActivity, "Erro ao sair: ${exception.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun updateUI(account: IAccount?) {
        if (account != null) {
            val email = account.username
            if (validateUser(email)) {
                loginButton.visibility = View.GONE
                errorText.visibility = View.GONE
                monitorLayout.visibility = View.VISIBLE
                
                // Salvar estado de autorização
                setAuthorized(true)

                if (checkPermission()) {
                    statusText.text = "Status: Monitoramento Ativo\nLogado como: $email"
                } else {
                    statusText.text = "Status: Aguardando Permissões...\nLogado como: $email"
                    requestPermission()
                }
                updateLogText()
            } else {
                loginButton.visibility = View.GONE
                monitorLayout.visibility = View.GONE
                errorText.visibility = View.VISIBLE
                setAuthorized(false)
                signOut() // Opcional: Deslogar se não autorizado
            }
        } else {
            loginButton.visibility = View.VISIBLE
            monitorLayout.visibility = View.GONE
            errorText.visibility = View.GONE
            setAuthorized(false)
        }
    }

    private fun validateUser(email: String): Boolean {
        // Exemplo simples de validação. 
        // Você pode trocar por uma lista de emails ou um domínio específico.
        // return email.endsWith("@empresa.com.br")
        return true // Por enquanto liberando todos que logarem com Microsoft
    }

    private fun setAuthorized(authorized: Boolean) {
        val prefs = getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("is_authorized", authorized).apply()
    }

    override fun onResume() {
        super.onResume()
        updateLogText()
        val filter = IntentFilter("com.monitor.sms.UPDATE_LOG")
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(updateReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(updateReceiver)
    }

    private fun updateLogText() {
        val prefs = getSharedPreferences("SmsMonitorPrefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("sms_count", 0)
        val sender = prefs.getString("last_sms_sender", "Nenhum")
        val body = prefs.getString("last_sms_body", "-")
        
        logText.text = "Total de SMS: $count\n\nÚltimo recebido:\nDe: $sender\nMsg: $body"
    }

    private fun checkPermission(): Boolean {
        val result = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS)
        val result2 = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS)
        return result == PackageManager.PERMISSION_GRANTED && result2 == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS),
            SMS_PERMISSION_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val statusText = findViewById<TextView>(R.id.statusText)
        if (requestCode == SMS_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Permissão SMS concedida", Toast.LENGTH_SHORT).show()
                statusText.text = "Status: Monitoramento Ativo\nPermissões Concedidas."
            } else {
                Toast.makeText(this, "Permissão SMS negada", Toast.LENGTH_SHORT).show()
                statusText.text = "Status: Monitoramento Inativo\nPermissão Negada."
            }
        }
    }
}
