package com.anonymous.myapp

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Enlaza el proceso a la red Wi-Fi actual.
 *
 * El hotspot del asistente (RKLLM-AP) no tiene internet, así que Android puede seguir
 * usando los datos móviles como red por defecto y las peticiones a 10.42.0.1 fallan.
 * bindToWifi() fuerza todo el tráfico del proceso por el Wi-Fi; unbind() lo devuelve a la
 * red por defecto (necesario para que el backend Riceback, que usa internet, siga funcionando).
 */
class WifiBinderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "WifiBinderModule"
    }

    private fun connectivityManager(): ConnectivityManager =
        reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    @Suppress("DEPRECATION")
    private fun findWifiNetwork(cm: ConnectivityManager): Network? {
        return cm.allNetworks.firstOrNull { network ->
            cm.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        }
    }

    @ReactMethod
    fun bindToWifi(promise: Promise) {
        try {
            val cm = connectivityManager()
            val wifi = findWifiNetwork(cm)
            if (wifi == null) {
                promise.resolve(false)
                return
            }
            promise.resolve(cm.bindProcessToNetwork(wifi))
        } catch (e: Exception) {
            promise.reject("WIFI_BIND_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun unbind(promise: Promise) {
        try {
            promise.resolve(connectivityManager().bindProcessToNetwork(null))
        } catch (e: Exception) {
            promise.reject("WIFI_UNBIND_ERROR", e.message, e)
        }
    }
}
