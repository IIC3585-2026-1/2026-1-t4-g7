const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");

initializeApp();

exports.notificarCambio = onDocumentUpdated(
    "grupos/principal",
    async (event) => {
      const antes = event.data.before.data();
      const despues = event.data.after.data();

      let mensaje = "Alguien hizo un cambio en el grupo";
      let cambioMiembros = false;
      let cambioGastos = false;

      if (despues.miembros.length > antes.miembros.length) {
        const nuevo = despues.miembros.filter(
            (m) => !antes.miembros.includes(m),
        );
        if (nuevo.length == 1) {
          mensaje = `Se agregó ${nuevo[0]} al grupo`;
        } else if (nuevo.length == 2) {
          mensaje = `Se agregó ${nuevo[0]} y ${nuevo[1]} al grupo`;
        } else if (nuevo.length == 3) {
          mensaje = `Se agregó ${nuevo[0]}, ${nuevo[1]} y ${nuevo[2]} al grupo`;
        } else {
          mensaje = `Se agregaron nuevas personas al grupo`;
        }
        cambioMiembros = true;
      }

      if (despues.gastos.length > antes.gastos.length) {
        if (despues.gastos.length > antes.gastos.length + 1) {
          mensaje = `Se agregaron nuevos gastos al grupo`;
        } else {
          const g = despues.gastos[despues.gastos.length - 1];
          mensaje = `${g.pagador} pagó ${g.descripcion} ($${g.monto})`;
        }
        cambioGastos = true;
      }

      if (cambioGastos && cambioMiembros) {
        mensaje = `Se agregaron nuevas personas y gastos al grupo`;
      }

      const tokensSnap = await getFirestore().collection("tokens").get();
      const tokens = tokensSnap.docs.map((d) => d.data().token);

      if (tokens.length === 0) return;

      await getMessaging().sendEachForMulticast({
        tokens,
        notification: {title: "VelocirAppTore", body: mensaje},
      });
    });
