package com.anonymous.myapp

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.ResolveInfo
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import java.util.Locale


data class VoiceSearchResult(
    val exists: Boolean,
    val voice: Voice?
)

class TtsVoices {
    companion object{
        var tts: TextToSpeech? = null
        //Se espera encontrar voces en español, por defecto
        private var expectedLanguage = Locale.forLanguageTag("es")
        private val maxInputLength = TextToSpeech.getMaxSpeechInputLength()
    }

    //***************************** Configuration and init stuff *********************************

    /**
     * Cambiar el idioma de las voces a buscar
     * @param languageTag Tag del idioma deseado de la voz (IANA Language Subtag Registry)
     * [Language Tags](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry)
     */
    fun setExpectedLanguage(languageTag: String){
        expectedLanguage = Locale.forLanguageTag(languageTag)
    }

    /**
     * Inicializar el Texto a voz
     * @param context Contexto de la aplicacion
     * @param expectedLanguageTag Tag del idioma deseado de la voz (IANA Language Subtag Registry)
     * @param resolve Accion a ejecutar cuando se termina la busqueda (pasa un booleano para saber
     * si se encontro la voz y fue acceptada por el motor)
     * [Language Tags](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry)
     */
    fun init(context: Context, expectedLanguageTag: String? = null, resolve: (Boolean)->Unit){
        if(expectedLanguageTag != null){
            setExpectedLanguage(expectedLanguageTag)
        }

        val engines = getEngines(context)
        searchValidVoiceBetweenEngines(engines, 0, context, { voice ->
            val confirm = tts?.setVoice(voice) //! Plausible crash
            println("El motor de tts aceptó la voz? ${confirm == TextToSpeech.SUCCESS}")
            resolve(confirm == TextToSpeech.SUCCESS)
        },{
            println("No se encontró una voz en español instalada")
            resolve(false)
        })
    }

    fun destroyer(){
        tts?.shutdown()
    }

    private fun initTTSEngine(engineName: String, context: Context, resolve: ()->Unit){
        tts = TextToSpeech(context, { status ->
            if (status == TextToSpeech.SUCCESS) {
                //**********IMPORTANT = WAIT UNTIL THE ENGINE IS INSTANCED
                resolve()
            }
        }, engineName)
    }

    /**
     * Listar los motores de TTS instalados en el dispositivo
     * @param context Contexto de la aplicacion
     * @return Lista de motores de TTS instalados en el dispositivo
     */
    fun getEngines(context: Context): List<String>{
        val intent = Intent("android.intent.action.TTS_SERVICE")
        val resolveInfos: MutableList<ResolveInfo?>? =
            context.packageManager.queryIntentServices(intent, 0)
        //processName and packageName aparently are the same
        val enginesNames = resolveInfos?.mapNotNull { it?.serviceInfo?.processName} ?: emptyList()
        return enginesNames
    }

    /**
     * Buscar una opcion de voz valida entre todos los motores de tts disponibles
     * @param engines Lista de motores de tts disponibles
     * @param index Indice del motor actual
     * @param context Contexto de la aplicacion
     * @param rAccept Accion a ejecutar si se encontro una voz valida (Se proporciona la voz encontrada)
     * @param rReject Accion a ejecutar si no se encontro una voz valida
     */
    fun searchValidVoiceBetweenEngines(engines: List<String>, index: Int, context: Context, rAccept: (Voice) -> Unit, rReject: Runnable){
        //Al buscar la voz en el idioma deseado ya se esta instanciando el motor
        //Asi que no hay que preocuparse por eso una vez terminada la busqueda
        initTTSEngine(engines[index], context) {
            val searchResult = TtsVoices().existAValidVoiceInstalled()
            if(searchResult.exists){
                println("${expectedLanguage.displayLanguage} voice is installed and found in ${engines[index]}")
                rAccept(searchResult.voice as Voice)
            }else{
                tts?.shutdown()
                if(index < engines.size - 1){
                    println("${expectedLanguage.displayLanguage} voice is not installed in ${engines[index]}")
                    searchValidVoiceBetweenEngines(engines, index + 1, context, rAccept, rReject)
                }else{
                    println("${expectedLanguage.displayLanguage} voice is not installed in any engine")
                    rReject.run()
                }
            }
        }
    }

    /**
     * Esta una voz en idioma deseado instalada en el motor instanciado?
     */
    fun existAValidVoiceInstalled(): VoiceSearchResult {
        val voices =  tts?.voices
        for (voice in voices ?: emptySet()) {
            if (isTheVoiceValid(voice)) {
                return VoiceSearchResult(
                    true,
                    voice
                )
            }
        }
        return VoiceSearchResult(
            false,
            null
        )
    }

    /**
     * Es esta voz del idioma deseado y esta instalada en el dispositivo?
     * @param voice La voz a evaluar
     * */
    private fun isTheVoiceValid(voice: Voice): Boolean {
        return isTheVoiceInstalled(voice) && matchesTheVoiceTheExpectedLanguage(voice)
    }
    private fun isTheVoiceInstalled(voice: Voice): Boolean {
        return !voice.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
    }
    private fun matchesTheVoiceTheExpectedLanguage(voice: Voice): Boolean {
        return voice.locale.isO3Language == expectedLanguage.isO3Language
    }


    fun openVoicesInstaller(context: Context){
        val intent = Intent( TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            context.startActivity(intent, )
        } catch (e: ActivityNotFoundException) {
            //TODO: No deberia de ser necesario, pero en este caso deberia de
            //Todo: llamarse a instalar un motor de TextToSpeech
            println("No TTS engine installed")
        }
    }

    //*******************************   Speak  *******************************************

    /**
     * Speak with the actual config
     * @param text Text to say
     * @return True if the text was spoken, false if not or text is too long
     */
    fun speak(text : String):Boolean{
        if(text.length > maxInputLength){
            println("Text is too long")
            return false
        }
        val hasSucced = tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
        return hasSucced == TextToSpeech.SUCCESS
    }

    fun stop(){
        tts?.stop()
    }
}