// !  Carga y configuración del modelo
let model;
let modeloCargado = false;
let historial = [];

const passageTextarea = document.getElementById("passage");
const buscarBtn = document.getElementById("buscarBtn");

// * Desactiva el botón hasta que el modelo esté listo
buscarBtn.disabled = true;

// * Carga el  modelo QnA de TensorFlow.js

async function cargarModelo() {
  try {
    console.log("Cargando modelo...");
    model = await qna.load(); // * Carga asincrónica del modelo de preguntas y respuestas
    modeloCargado = true;
    console.log("Modelo cargado exitosamente");
    toast("Modelo cargado. Haz una pregunta para comenzar");
    buscarBtn.disabled = false;
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
  }
}

cargarModelo();

// * Muestra notificación tipo toast

function toast(texto) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = texto;
  toast.addEventListener("click", () => toast.remove());
  document.body.appendChild(toast);
}

// * Traduce texto usando API de Google Translate

async function traducir(texto, desde = "es", a = "en") {
  try {
    const detect = await fetch("https://translation.googleapis.com/language/translate/v2/detect",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-goog-api-key":API_KEY
      },
      body: JSON.stringify({
        q:texto,
      })
    })
    const lenguaje = await detect.json().then((json)=>json.data.detections[0][0].language)
    if (lenguaje !== a){
      var response = await fetch("https://translation.googleapis.com/language/translate/v2", {
        method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        q: texto,
        target: a,
        format: "text"
      })
    });
  }

  if (!response.ok) throw new Error(`Error de traducción: ${response.status}`);
  const data = await response.json();
    return data.data.translations[0].translatedText || texto;
  } catch (error) {
    console.warn("Error en traducción, usando texto original:", error);
    return texto; 
  }
}

// ! Actualiza chat visual en la interfaz

function actualizarChat() {
  const grid = document.querySelector(".grid1");
  const mensaje = document.createElement("div");

  historial.map((msg, i) => {
    mensaje.className = (i % 2 === 0) ? "msgPregunta" : "msgRespuesta";
    mensaje.innerText = msg;
    grid.appendChild(mensaje);
  });
}

// *  Leer texto con voz (SpeechSynthesis)

function leerTexto(texto) {
  try {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(texto);
      msg.lang = "es-ES";
      msg.rate = 0.8;
      window.speechSynthesis.speak(msg);
    }
  } catch (error) {
    console.warn("Error en síntesis de voz:", error);
  }
}


// ! Procesa pregunta y obtiene respuesta del modelo

async function preguntar() {
  const passage = passageTextarea.value.trim();
  const preguntaES = document.getElementById("question").value.trim();

  if (!modeloCargado) {
    toast("El modelo aún se está cargando, espera un momento...");
    return;
  }

  try {
    buscarBtn.disabled = true;

    // * Traduce pregunta y contexto al inglés
    const preguntaEN = await traducir(preguntaES, "es", "en");
    historial.push(preguntaES);
    actualizarChat();

    const passageEN = await traducir(passage, "auto", "en");

    // * Consulta al modelo
    const answers = await model.findAnswers(preguntaEN, passageEN);
    console.log("Respuestas encontradas:", answers);

    if (answers && answers.length > 0 && answers[0].score > 0.1) {
      const respuestaEN = answers[0].text;
      const respuestaES = await traducir(respuestaEN, "en", "es");

      leerTexto(respuestaES); // * Lectura en voz alta
      historial.push(respuestaES);
      actualizarChat();

      // * Limpia input
      document.getElementById("question").value = "";

      

    } else {
      historial.push("No se encontró una respuesta.");
      toast("No se encontró una respuesta adecuada en el texto proporcionado.");
    }
  } catch (error) {
    console.error("Error al procesar pregunta:", error);
    toast("Error al procesar la pregunta.");
  } finally {
    buscarBtn.disabled = false;
  }
}

// ! Lee archivo .txt o .pdf y cargar contenido al textarea
async function leerArchivo(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  try {
    if (archivo.type === "text/plain") {
      // * Carga archivo de texto plano
      const texto = await archivo.text();
      passageTextarea.value = texto;
      toast("Archivo de texto cargado correctamente.");
    } else if (archivo.type === "application/pdf") {
      toast("Procesando PDF...");

      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(reader.result);
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let textoCompleto = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const textItems = content.items.map(item => item.str).join(" ");
            textoCompleto += textItems + "\n\n";
          }

          passageTextarea.value = textoCompleto.trim();
          toast(`PDF procesado correctamente. ${pdf.numPages} páginas leídas.`);
        } catch (error) {
          console.error("Error al procesar PDF:", error);
          toast("Error al procesar el PDF.");
        }
      };

      reader.readAsArrayBuffer(archivo);
    } else {
      alert("Formato no soportado. Solo se permiten archivos .txt o .pdf");
    }
  } catch (error) {
    console.error("Error al leer archivo:", error);
    toast("Error al leer el archivo.");
  }
}

// * Actualiza la interfaz de chat al inicio
actualizarChat();
