import * as d3 from 'd3';
import Dexie from 'dexie';
import {importDB, exportDB, importInto, peakImportFile} from "dexie-export-import";
import download from 'downloadjs';

import { findNodeIdByName, findNodeById, getPositionOfLinks } from './auxiliar.js';

// Declaramos la base de datos
var db = new Dexie('addc');
// Creamos las tablas
db.version(2).stores({
  nodos: '++id,name,x,y',
  links:'++id,source,target'});

// Mecanismos de importacion/exportacion de la bd via funciones de Dexie
const dropZoneDiv = document.getElementById('dropzone');
const exportLink = document.getElementById('exportLink');

// Configure exportLink
exportLink.onclick = async ()=>{
  try {
    const blob = await db.export({prettyJson: true, progressCallback});
    download(blob, "dexie-export.json", "application/json");
  } catch (error) {
    console.error(''+error);
  }
};

// Configure dropZoneDiv
dropZoneDiv.ondragover = event => {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
};

// Handle file drop:
dropZoneDiv.ondrop = async ev => {
  ev.stopPropagation();
  ev.preventDefault();

  // Pick the File from the drop event (a File is also a Blob):
  const file = ev.dataTransfer.files[0];
  try {
    if (!file) throw new Error(`Only files can be dropped here`);
    console.log("Importing " + file.name);
    await db.delete();
    db = await Dexie.import(file, {
      progressCallback
    });
    console.log("Import complete");
  } catch (error) {
    console.error(''+error);
  }
}

// Progress callback para indicar el progreso de la importacion/exportacion
function progressCallback ({totalRows, completedRows}) {
  console.log(`Progress: ${completedRows} of ${totalRows} rows completed`);
}

// Cambiar el comportamiento del botón derecho del mouse
document.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});

// Seleccionar el elemento div con id "mi-grafica"
// le damos una anchura del tamaño de la pantalla
var svg = d3.select("#mi-grafica")
    .append("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);

// TODO Pendiente de eliminar
// Datos del grafo dirigido (ejemplo)
let graphData = {
  nodes: [],
  links: []
};

// Crear un grupo para agregar las ideas
var nodesGroup = svg.append("g");

// Si hay elementos en db.nodos, los agregamos al grafo
db.nodos.each(function (nodo) {
  const newNode = nodesGroup.append("g");
  newNode.append("circle")
    .attr("cx", nodo.x)
    .attr("cy", nodo.y)
    .attr("r", 20)
    .attr("fill", "blue")
    .attr("id", nodo.name)
    .on("mousedown", function(event) {
      if (event.button === 2) {
        // Tu código para el evento de clic del botón izquierdo aquí
        createLink(event,this);
      }
    })

    newNode.append("text")
      .attr('x',  nodo.x+20)
      .attr('y',  nodo.y+20)
      .text(nodo.name)
      .clone(true).lower()
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 3);  

    const newNodeRef = { id: nodo.id, name: nodo.name, x: nodo.x, y: nodo.y };
    graphData.nodes.push(newNodeRef);
  });

// Renderizar los links entre los nodos
// TODO ... Se podrian pintar a la que se van pintando los nodos? Posiblemente no...
var enrichedLinks = await getPositionOfLinks(db);

await Promise.all (enrichedLinks.map (async link => {
  const newLink = svg.append("line")
    .attr("x1", link.startNode.x)
    .attr("y1", link.startNode.y)
    .attr("x2", link.endNode.x)
    .attr("y2", link.endNode.y)
    .attr("stroke-width", 2)
    .attr("stroke", "black");
}));

// Agregamos un listener al SVG para capturar el evento click
svg.on("click", function(event) {

  // Obtener las coordenadas del evento en relación al SVG
  const point = d3.pointer(event, this);

  // Creamos el nuevo nodo como un grupo <g>
  const newNode = nodesGroup.append("g");

  var exist = false;
  var texto = "";
  var key = null;

  texto = prompt("Idea?");
  var newItem = {name: texto, x: point[0], y: point[1]};

  // Busqueda basica de duplicados por nombre
  db.nodos.get({"name":texto}).then( function(nodos) {
    if (nodos === undefined) {

      // Lo insertamos en la base de datos
      key = db.nodos.put(newItem).then(id => {

      // Creamos el nuevo nodo como un círculo
      newNode.append("circle")
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("r", 20)
      .attr("fill", "blue")
      .attr("id", texto)
      .on("mousedown", function(event) {
        if (event.button === 2) {
          // Tu código para el evento de clic del botón izquierdo aquí
          createLink(event,this);
        }});

      // Agregamos una etiqueta de texto al nodo
      // en la posicion relativa del nodo
      newNode.append("text")
        .attr('x',  point[0]+20)
        .attr('y',  point[1]+20)
        .text(texto)
        .clone(true).lower()
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 3);

        const newNodeRef = { id: key.id, name: texto, x: point[0], y: point[1] };
        graphData.nodes.push(newNodeRef);
      }); 
    } else {
      alert("Ya existe un nodo con ese nombre");
    }
  }).catch(function(error) {
    // Handle error
  });
 
});

var startNode = null;

// Funcion de creacion del link entre nodos (en dos tiempos)
function createLink(event, d) {
  if (startNode === null) {
    // Si no hay un nodo de inicio previo, establece el nodo actual como el nodo de inicio
    startNode = d3.select(d);
  } else {
    // Si hay un nodo de inicio previo, crea un enlace desde el nodo de inicio al nodo actual
    const endNode = d3.select(d);
    
    var x1=startNode.attr("cx");
    var y1=startNode.attr("cy");
    var x2=endNode.attr("cx");
    var y2=endNode.attr("cy");
    
    // TODO Cambiar esta funcion para devovler en nodo y sacar de el el id???
    const newLink = { source: findNodeIdByName(db, startNode.attr("id")), target: findNodeIdByName(db, endNode.attr("id")) };
    db.links.put(newLink);
    graphData.links.push(newLink);

    // Dibuja el enlace como una línea entre los dos ideas
    drawLineBetweenNodes(x1,y1,x2,y2);

    // Reinicia el nodo de inicio para permitir la creación de nuevos enlaces
    startNode = null;
  }
}

// Lincar al evento de teclado control + z
document.addEventListener("keydown", function(event) {
  if (event.ctrlKey && event.key === "z") {
    deshacerNodo();
  }
  if (event.ctrlKey && event.key === "x") {
    deshacerLink();
  }  
});

function drawLineBetweenNodes(x1, y1, x2, y2) {
  svg.append("line")
    .attr("class", "link")
    .attr("x1", x1)
    .attr("y1", y2)
    .attr("x2", x2)
    .attr("y2", y2)
    .attr("stroke", "black");
}

// Funcion para eliminar el ultimo nodo añadido
function deshacerNodo(){
  var item = graphData.nodes.pop();
  db.nodos.delete(item.id);
}

// Funcion para eliminar el ultimo link añadido
function deshacerLink(){
  var item = graphData.links.pop();
  db.links.delete(item.id);
}

// Manejador de clic en el botón de borrar el localStorage
document.getElementById('clear-localstorage').addEventListener('click', () => {
  localStorage.removeItem('graphData');
  // elimina el contenido del indexDB
  db.nodos.clear();
  db.links.clear();
  console.log('localStorage borrado');
});
