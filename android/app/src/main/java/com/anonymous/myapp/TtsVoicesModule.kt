package com.anonymous.myapp

import kotlinx.coroutines.*
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice

import java.util.Locale

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray

class TtsVoicesModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private val ttsManager = TtsVoices()
    }
    override fun getName(): String {
        return "TtsVoicesModule"
    }

    @ReactMethod
    fun init(expectedLanguageTag: String? = "es", promise: Promise){
        ttsManager.init(reactApplicationContext, expectedLanguageTag){ voiceFoundAndSetted ->
            if(voiceFoundAndSetted){
                println("Voice setted")
                promise.resolve(true)
            }else{
                //call to voices administrator
                promise.reject("INITIALIZATION_ERROR","No available TTS engines or voices with the spected language tag $expectedLanguageTag")
            }
        }
    }

    @ReactMethod
    fun openVoicesInstaller(){
        ttsManager.openVoicesInstaller(reactApplicationContext)
    }

    @ReactMethod
    fun speak(text: String, promise: Promise){
        promise.resolve( ttsManager.speak(text) )
    }

    @ReactMethod
    fun stop(){
        ttsManager.stop()
    }
    

}