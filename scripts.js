"use strict";

const COLS = 4;
const ROWS = 4;

const rasterMap = document.getElementById("rasterMap");
const tableElement = document.getElementById("table");
const boardElement = document.getElementById("board");

let solved = false;
let dragOffset = {x: 0, y: 0};

if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        position => map.setView([position.coords.latitude, position.coords.longitude]),
        error => console.warn("Geolocation:", error.message)
    );
}

const map = L.map("map").setView([53.430127, 14.564802], 18);
L.tileLayer.provider("Esri.WorldImagery").addTo(map);
let marker = null;

document.getElementById("getLocation").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Twoja przeglądarka nie obsługuje geolokalizacji.");
        return;
    }
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        document.getElementById("latitude").innerText = lat.toFixed(6);
        document.getElementById("longitude").innerText = lon.toFixed(6);
        map.setView([lat, lon]);
        if (marker) {
            marker.setLatLng([lat, lon]);
        } else {
            marker = L.marker([lat, lon]).addTo(map);
        }
    }, error => {
        console.error(error);
        alert("Nie udało się pobrać lokalizacji: " + error.message);
    });
});

document.getElementById("saveButton").addEventListener("click", () => {
    leafletImage(map, (err, canvas) => {
        if (err) {
            console.error(err);
            return;
        }
        const ctx = rasterMap.getContext("2d");
        ctx.clearRect(0, 0, rasterMap.width, rasterMap.height);
        ctx.drawImage(canvas, 0, 0, rasterMap.width, rasterMap.height);
        createPuzzles();
    });
});

function createPuzzles() {
    solved = false;
    tableElement.innerHTML = "";
    boardElement.innerHTML = "";

    const pw = rasterMap.width / COLS;
    const ph = rasterMap.height / ROWS;

    for (let i = 0; i < COLS * ROWS; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.index = i;
        addDropBehaviour(slot);
        boardElement.appendChild(slot);
    }
    addDropBehaviour(tableElement);

    const pieces = [];
    for (let i = 0; i < COLS * ROWS; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const piece = document.createElement("canvas");
        piece.width = pw;
        piece.height = ph;
        piece.getContext("2d").drawImage(rasterMap, col * pw, row * ph, pw, ph, 0, 0, pw, ph);
        piece.className = "piece";
        piece.id = "piece-" + i;
        piece.dataset.index = i;
        piece.draggable = true;
        addDragBehaviour(piece);
        pieces.push(piece);
    }

    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    for (const piece of pieces) {
        placeOnTable(piece,
            Math.random() * (tableElement.clientWidth - pw),
            Math.random() * (tableElement.clientHeight - ph));
    }
}

function placeOnTable(piece, x, y) {
    tableElement.appendChild(piece);
    piece.style.left = Math.max(0, Math.min(x, tableElement.clientWidth - piece.width)) + "px";
    piece.style.top = Math.max(0, Math.min(y, tableElement.clientHeight - piece.height)) + "px";
}

function addDragBehaviour(piece) {
    piece.addEventListener("dragstart", event => {
        dragOffset = {x: event.offsetX, y: event.offsetY};
        event.dataTransfer.setData("text", piece.id);
    });
}

function addDropBehaviour(target) {
    target.addEventListener("dragover", event => event.preventDefault());
    target.addEventListener("drop", event => {
        event.preventDefault();
        const piece = document.getElementById(event.dataTransfer.getData("text"));
        if (!piece || solved) return;

        if (target === tableElement) {
            const rect = tableElement.getBoundingClientRect();
            placeOnTable(piece,
                event.clientX - rect.left - tableElement.clientLeft - dragOffset.x,
                event.clientY - rect.top - tableElement.clientTop - dragOffset.y);
        } else {
            const occupant = target.querySelector(".piece");
            if (occupant && occupant !== piece) {
                placeOnTable(occupant, Math.random() * 400, Math.random() * 200);
            }
            piece.style.left = piece.style.top = "";
            target.appendChild(piece);
        }
        checkSolved();
    });
}

function checkSolved() {
    let correct = 0;
    for (const slot of boardElement.children) {
        const piece = slot.querySelector(".piece");
        if (piece && piece.dataset.index === slot.dataset.index) correct++;
    }
    console.debug(`Poprawnie ułożone: ${correct}/${COLS * ROWS}`);

    if (correct === COLS * ROWS) {
        solved = true;
        console.debug("Wszystkie puzzle ułożone poprawnie!");
        notifySolved();
    }
}

function notifySolved() {
    if (!("Notification" in window)) return;
    const show = () => new Notification("Puzzle ułożone!", {body: "Wszystkie 16 elementów jest na swoim miejscu."});
    if (Notification.permission === "granted") {
        show();
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => { if (p === "granted") show(); });
    }
}
