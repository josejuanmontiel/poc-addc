import * as d3 from 'd3';
import Dexie from 'dexie';

import { exportar, importar } from './auxiliar.js';

// TODO GENERALES
// Revisar la exportacion porque no parece meter los links
// Falta input de donde coger el fichero a importar

var db = new Dexie('addc');
db.version(1).stores({nodos: '++id,name,x,y'});

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

// TODO Recuperar los enlaces desde la base de datos y añadirlas a graphData.links




// Agregamos un listener al SVG para capturar el evento click
svg.on("click", function(event) {

  // Obtener las coordenadas del evento en relación al SVG
  const point = d3.pointer(event, this);

  // Creamos el nuevo nodo como un grupo <g>
  const newNode = nodesGroup.append("g");

  var exist = false;
  var texto = "";
  var key = null;

  // TODO mejorar la iteracion para no salir hasta que se encuentre un texto que no este en la base de datos
  texto = prompt("Idea?");
  var newItem = {name: texto, x: point[0], y: point[1]};

  // Busqueda basica de duplicados por nombre
  db.nodos.get({"name":texto}).then( function(nodos) {
    if (nodos === undefined) {
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

function createLink(event, d) {
  if (startNode === null) {
    // Si no hay un nodo de inicio previo, establece el nodo actual como el nodo de inicio
    startNode = d3.select(d);
  } else {
    // Si hay un nodo de inicio previo, crea un enlace desde el nodo de inicio al nodo actual
    const endNode = d3.select(d);
    
    const newLink = { source: startNode.id, target: endNode.id };
    graphData.links.push(newLink);

    // TODO Almacenar el enlace en la base de datos

    // Dibuja el enlace como una línea entre los dos ideas
    svg.append("line")
      .attr("class", "link")
      .attr("x1", startNode.attr("cx"))
      .attr("y1", startNode.attr("cy"))
      .attr("x2", endNode.attr("cx"))
      .attr("y2", endNode.attr("cy"))
      .attr("stroke", "black");

    // Reinicia el nodo de inicio para permitir la creación de nuevos enlaces
    startNode = null;
  }
}

// TODO Drag nodes and store the new position in the graphData object

// TODO Implement zooming and panning

// Lincar al evento de teclado control + z
document.addEventListener("keydown", function(event) {
  if (event.ctrlKey && event.key === "z") {
    deshacer();
  }
});

// Funcion para eliminar el ultimo nodo añadido
function deshacer(){
  var item = graphData.nodes.pop();
  db.nodos.delete(item.id);
  // TODO Redibujar el grafo

}

// Manejador de clic en el botón de exportación
document.getElementById('exportar').addEventListener('click', () => {
  // Crea un objeto con el contenido del grafo para exportar
  const exportData = {
    nodes: graphData.nodes,
    links: graphData.links
  };

  // Convierte el objeto a una cadena JSON
  const jsonData = JSON.stringify(exportData, null, 2);

  // Crea un enlace de descarga
  const downloadLink = document.createElement('a');
  downloadLink.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonData);
  downloadLink.download = 'graph_data.json';

  // Simula un clic en el enlace para iniciar la descarga
  downloadLink.click();
});

// Manejador de clic en el botón de cargar ideas
document.getElementById('importar').addEventListener('click', () => {
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      console.log('Contenido del archivo:', event.target.result);
      const contents = event.target.result;
      const parsedData = JSON.parse(contents);

      // Verificar que los datos cargados son válidos
      if (parsedData && Array.isArray(parsedData.nodes) && Array.isArray(parsedData.links)) {
        console.log('Datos cargados:', parsedData);

        // Actualizar el grafo con los ideas cargados
        // TODO Revisar el modelo de datos para ver si es necesario hacer alguna transformación
        graphData.nodes = parsedData.nodes.map((node, index) => {
          const newNode = {
            ...node,
            x: node.x,
            y: node.y
          };
          console.log('Añadiendo nodo en posición', index, ':', newNode);
          return newNode;
        });
        graphData.links = parsedData.links;

        console.log('Grafo actualizado:', graphData);
        updateGraphAndAnimate();
      } else {
        console.error('El archivo no contiene datos válidos de ideas.');
      }
    };

    reader.readAsText(file);
  }
});

// Manejador de clic en el botón de borrar el localStorage
document.getElementById('clear-localstorage').addEventListener('click', () => {
  localStorage.removeItem('graphData');
  // elimina el contenido del indexDB
  db.nodos.clear();
  console.log('localStorage borrado');
});

// Manejador de clic en el botón de guardar en el localStorage
document.getElementById('update-localstorage').addEventListener('click', () => {
  localStorage.setItem('graphData', JSON.stringify(graphData));
  console.log('Grafo guardado en localStorage');
});
