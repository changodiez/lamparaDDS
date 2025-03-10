const express = require("express");
const osc = require("osc");
const WebSocket = require("ws");
const path = require('path');
const { exec } = require("child_process");

const app = express();
const PORT = 8080;

//Cambiar 192.168.0.100 por el ip destinado al router

// Servir archivos estáticos, como el HTML y CSS
app.use(express.static(path.join(__dirname, 'public')));

// Configuración OSC
const oscPortOut = 8000;
const oscPortIn = 8010;
const oscClient = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: oscPortIn,
    //remoteAddress: "192.168.0.100",
    remoteAddress: "172.20.15.250",
    remotePort: oscPortOut,
});

oscClient.open();

// Servidor WebSocket
const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8081 });

wss.on("connection", (ws) => {
    console.log("Cliente WebSocket conectado");

      // Envío de keep-alive cada 3 segundos
      const keepAliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "keep-alive" }));
        }
    }, 3000); // 3 segundos

    ws.on("message", (data) => {
        const message = JSON.parse(data);
        
        if (message.type === "send-osc") {
            // Procesa el mensaje OSC desde el cliente y envíalo
            const oscMessage = {
                address: message.address,
                args: [{ type: "i", value: message.value }]
            };
            //oscClient.send(oscMessage, "192.168.0.100", oscPortOut);
            oscClient.send(oscMessage, "172.20.15.250", oscPortOut);            
            console.log(`OSC enviado: ${JSON.stringify(oscMessage)}`);
        }
    });

    ws.on("close", () => {
        console.log("WebSocket desconectado");
    });
});


// Endpoint para apagar el ordenador
app.post("/shutdown", (req, res) => {
    exec("shutdown /s /f /t 0", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al apagar: ${error}`);
            return res.status(500).send("Error al intentar apagar.");
        }
        res.send("Apagando el ordenador.");
    });
});

// Endpoint para reiniciar el ordenador
app.post("/restart", (req, res) => {
    exec("shutdown /r /f /t 0", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al reiniciar: ${error}`);
            return res.status(500).send("Error al intentar reiniciar.");
        }
        res.send("Reiniciando el ordenador.");
    });
});


// Escucha mensajes OSC desde la aplicación y reenvía al cliente WebSocket
oscClient.on("message", (oscMsg) => {
    console.log("Mensaje OSC recibido:", oscMsg);
    const data = JSON.stringify(oscMsg);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
});

app.listen(PORT, "0.0.0.0", () => {
    //console.log(`Servidor corriendo en http://192.168.0.100:${PORT}`);
    console.log(`Servidor corriendo en http://172.20.15.250:${PORT}`);

});
