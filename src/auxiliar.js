// Encuentra el id de un nodo por su nombre
async function findNodeIdByName(db, name) {
    try {
      const nodos = await db.nodos.get({ "name": name });
      if (nodos === undefined) {
        console.log("No se encontró el nodo");
        return null;
      } else {
        const id = nodos.id;
        return id;
      }
    } catch (error) {
      console.error("Error al buscar el nodo:", error);
      return null;
    }
}

// Encuentra el nodo por su id
function findNodeById(db, id) {
    db.nodos.get({"id":id}).then( function(nodo) {
        if (nodo === undefined) {
            console.log("No se encontro el nodo con id: " + id);
            return nill;
        } else {
            return nodo;
        }
    });
}

// Encuentra las posiciones de inicio y fin de un link
async function getPositionOfLinks(db) {
  const links = await db.links.toArray();
  
  await Promise.all(links.map(async link => {
    [link.startNode, link.endNode] = await Promise.all([
      db.nodos.get(link.source),
      db.nodos.get(link.target)
    ]);
  }));
  
  return links;
}


export { findNodeIdByName, findNodeById, getPositionOfLinks};