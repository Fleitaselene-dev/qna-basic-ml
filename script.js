let model;
let modeloCargado = false;
let historial = []
const passageTextarea = document.getElementById("passage");
// const respuestaDiv = document.getElementById("respuesta");
// const listaHistorial = document.getElementById("listaHistorial");
const buscarBtn = document.getElementById("buscarBtn");
async function cargarModelo() {
  try {
    console.log("Cargando modelo...");
    model = await qna.load();
    modeloCargado = true;
    console.log("Modelo cargado exitosamente");
    toast("Modelo cargado. Haz una pregunta para comenzar")
    // respuestaDiv.innerHTML = "Respuesta: <em>Modelo cargado. Haz una pregunta para comenzar.</em>";
    buscarBtn.disabled = false;
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
    // respuestaDiv.innerHTML = "Error al cargar el modelo. Recarga la página.";
  }
}


function toast(texto){
  const toast = document.createElement("div")
  toast.className = "toast"
  toast.textContent = texto
  toast.addEventListener("click",()=> toast.remove())
  document.body.appendChild(toast)
}
// Inicializar
buscarBtn.disabled = true;
cargarModelo();

// Traducción automática usando LibreTranslate
async function traducir(texto, desde = "es", a = "en") {
  try {
    const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
       },
      body: JSON.stringify({
        q: texto,
        target: a,
        format: "text"
      })
    });

    if (!response.ok) {
      throw new Error(`Error de traducción: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.translations[0].translatedText || texto; // Fallback al texto original si falla
  } catch (error) {
    console.warn("Error en traducción, usando texto original:", error);
    return texto; // Usa el texto original si falla la traducción
  }
}


function actualizarChat(){
  const grid = document.querySelector(".grid1")
  const mensaje = document.createElement("div")
  historial.map((msg,i)=>{
    console.log(i)
    mensaje.className = (i % 2 == 0) ? "msgPregunta" : "msgRespuesta"
    mensaje.innerText = msg
    grid.appendChild(mensaje)
  })
}
// Lectura por voz
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

// Historial
function agregarHistorial(pregunta, respuesta) {
  const item = document.createElement("li");
  item.innerHTML = `<strong> ${pregunta}</strong><br> ${respuesta}`;
  item.style.marginBottom = "10px";
  listaHistorial.insertBefore(item, listaHistorial.firstChild); // Agrega al inicio
}

// pesaltado en el texto 
function resaltarTexto(textoRespuesta) {
  const contenido = passageTextarea.textContent;
  
  // para  caracteres especiales para regex
  const textoEscapado = textoRespuesta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Crea nueva regex
  const regex = new RegExp(`(${textoEscapado})`, "gi");
  
  // un div temporal para mostrar el texto resaltado
  const divResaltado = document.createElement("div");
  divResaltado.innerHTML = contenido.replace(regex, '<span class="resaltado">$1</span>');
  divResaltado.style.cssText = "margin-top: 10px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 5px;";
  
  // Remueve el resaltado anterior si existe
  const resaltadoAnterior = document.getElementById("textoResaltado");
  if (resaltadoAnterior) {
    resaltadoAnterior.remove();
  }
  
  divResaltado.id = "textoResaltado";
  divResaltado.innerHTML = "<strong>📍 Texto con respuesta resaltada:</strong><br>" + divResaltado.innerHTML;
  
  // Inserta después del textarea
  passageTextarea.parentNode.insertBefore(divResaltado, passageTextarea.nextSibling);
}

async function preguntar() {
  const passage = passageTextarea.value.trim();
  const preguntaES = document.getElementById("question").value.trim();

  if (!modeloCargado) {
    toast("El model aún se está cargando, espera un momento...")
    return;
  }

  // if (!preguntaES) {
  //   respuestaDiv.textContent = "Por favor escribe una pregunta.";
  //   return;
  // }

  // if (!passage) {
  //   respuestaDiv.textContent = " Por favor proporciona un texto para analizar.";
  //   return;
  // }

  try {
    buscarBtn.disabled = true;
    // respuestaDiv.innerHTML = "Buscando respuesta...";

    // Traduce pregunta al inglés
    const preguntaEN = await traducir(preguntaES, "es", "en");
    console.log("Pregunta traducida al inglés:", preguntaEN);
    // passageES = await traducir(passage)
    // console.log("passage español:",passageES)
    historial.push(preguntaES)
    actualizarChat()
    //Traducir el contexto a inglés
    const passageEN = await traducir(passage,"auto","en")
    // Obtenie respuestas del modelo
    const answers = await model.findAnswers(preguntaEN, passageEN);
    console.log("Respuestas encontradas:", answers);

    if (answers && answers.length > 0 && answers[0].score > 0.1) {
      const respuestaEN = answers[0].text;
      const confianza = Math.round(answers[0].score * 100);
      
      // Traduce la respuesta al español
      const respuestaES = await traducir(respuestaEN, "en", "es");

      // respuestaDiv.innerHTML = ` <strong>Respuesta:</strong> ${respuestaES}<br><small>Confianza: ${confianza}%</small>`;
      
      // Leerespuesta en voz alta
      leerTexto(respuestaES);
      
      // Agrega al historial
      // agregarHistorial(preguntaES, respuestaES);
      historial.push(respuestaES)
      actualizarChat()
      // Resalta texto en el documento
      // resaltarTexto(respuestaEN);
      
      // Limpia la pregunta
      document.getElementById("question").value = "";
      
    } else {
      console.log("no se encontró una respuesta")
      historial.push("No se encontró una respuesta.")
      toast("No se encontró una respuesta adecuada en el texto proporcionado.")
      // respuestaDiv.innerHTML = "No se encontró una respuesta adecuada en el texto proporcionado.";
    }
  } catch (error) {
    console.error("Error al procesar pregunta:", error);
    // respuestaDiv.innerHTML = "Error al procesar la pregunta. Inténtalo de nuevo.";
    console.log("Error al procesar la pregunta. Inténtalo de nuevo.")
  } finally {
    buscarBtn.disabled = false;
  }
}

// * Lectura de archivo 
async function leerArchivo(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  try {
    if (archivo.type === "text/plain") {
      const texto = await archivo.text();
      passageTextarea.value = texto;
      respuestaDiv.innerHTML = "Archivo de texto cargado correctamente.";
      
    } else if (archivo.type === "application/pdf") {
      respuestaDiv.innerHTML = "Procesando PDF...";
      
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(reader.result);
          
          // Configura PDF.js
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
          respuestaDiv.innerHTML = `PDF procesado correctamente. ${pdf.numPages} páginas leídas.`;
          
        } catch (error) {
          console.error("Error al procesar PDF:", error);
          respuestaDiv.innerHTML = "Error al procesar el PDF.";
        }
      };
      reader.readAsArrayBuffer(archivo);
      
    } else {
      alert("Formato no soportado. Solo se permiten archivos .txt o .pdf");
    }
  } catch (error) {
    console.error("Error al leer archivo:", error);
    respuestaDiv.innerHTML = "Error al leer el archivo.";
  }
}

actualizarChat()