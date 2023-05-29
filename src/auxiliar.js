// Exportemos el contenido de los ideas a un archivo JSON
function exportar() {
    var nodes = [];
    nodesGroup.selectAll("g").each(function (d, i) {
        var node = d3.select(this);
        nodes.push({
            id: i,
            x: node.select("circle").attr("cx"),
            y: node.select("circle").attr("cy"),
            text: node.select("text").text()
        });
    });
    console.log(JSON.stringify(nodes));
}
  
// Importemos el contenido de los ideas desde un archivo JSON
function importar() {
    var nodes = JSON.parse(prompt("Ingrese el contenido del archivo JSON"));
    nodesGroup.selectAll("g").remove();
    nodes.forEach(function (node) {
        const newNode = nodesGroup.append("g");
        newNode.append("circle")
            .attr("cx", node.x)
            .attr("cy", node.y)
            .attr("r", 20)
            .attr("fill", "blue")
            .on("mousedown", function (event) {
                if (event.button === 2) {
                    // Tu código para el evento de clic del botón izquierdo aquí
                    createLink(event, this);
                }
            });
        newNode.append("text")
            .attr('x', node.x + 20)
            .attr('y', node.y + 20)
            .text(node.text)
            .clone(true).lower()
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 3);
    });
}

export { exportar, importar };