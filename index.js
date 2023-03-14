const open = require("open");
const path = require("path");
const express = require("express");
const mercadopago = require("mercadopago");
var request = require("request");
const mysql = require("mysql")

const mercadoPagoPublicKey = process.env.MERCADO_PAGO_SAMPLE_PUBLIC_KEY;
if (!mercadoPagoPublicKey) {
  console.log("Error: public key not defined");
  process.exit(1);
}

const mercadoPagoAccessToken = process.env.MERCADO_PAGO_SAMPLE_ACCESS_TOKEN;
if (!mercadoPagoAccessToken) {
  console.log("Error: access token not defined");
  process.exit(1);
}

mercadopago.configurations.setAccessToken(mercadoPagoAccessToken);

const app = express();

app.set("view engine", "html");
app.engine("html", require("hbs").__express);
app.set("views", path.join(__dirname, "views"))

app.use(express.urlencoded({ extended: false }));
app.use(express.static("./static"));
app.use(express.json());

app.get("/", function (req, res) {
  res.status(200).render("index", { mercadoPagoPublicKey });
}); 


app.post("/preapproval", (req, res) => {

  var options = {
    method: 'POST',
    url: 'https://api.mercadopago.com/preapproval',
    headers: {
      'Authorization': 'Bearer [MERCADO PAGO ACCESS TOKEN]',
      'Content-Type': 'application/json'
    },
    body: {
      preapproval_plan_id: req.body["preapproval_plan_id"],
      reason: req.body["reason"],
      payer_email: req.body["payer_email"],
      card_token_id: req.body["card_token_id"],
      auto_recurring: {
        frequency: req.body["auto_recurring"]["frequency"],
        frequency_type: req.body["auto_recurring"]["frequency_type"],
        start_date: req.body["auto_recurring"]["start_date"],
        end_date: req.body["auto_recurring"]["end_date"],
        transaction_amount: req.body["auto_recurring"]["transaction_amount"],
        currency_id: req.body["auto_recurring"]["currency_id"]
      },
      back_url: req.body["back_url"],
      status: req.body["status"]
    },
    json: true
    
  };
  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    /*
    if(!error){
      console.log(response.body)
    }*/
  });
  res.status(200)
})

app.post("/process_payment", (req, res) => {
  
  const { body } = req;
  const { payer } = body;
  const paymentData = {
    transaction_amount: Number(body.transactionAmount),
    token: body.token,
    description: body.description,
    installments: Number(body.installments),
    payment_method_id: body.paymentMethodId,
    issuer_id: body.issuerId,
    payer: {
      email: payer.email,
    }
  };

  mercadopago.payment.save(paymentData)
    .then(function(response) {
      const { response: data } = response;

      //console.log(response.body)

      const connection = mysql.createConnection({
        host: '78.138.46.28',
        user: 'aplicacion',
        password: '4pl1c4c10N01!',
        database: 'cobroGptWhats'
      });
      connection.connect((err) => {
        if (err) {
          console.error('Error connecting: ' + err.stack);
          return;
        } 
        //console.log(response.body)
          const sql = `INSERT INTO payments(id_pago, whatsapp, metodo_pago, card_name, email, status, status_detail) VALUES ('${response.body["id"]}', '${req.body["external_reference"]}', '${response.body["payment_method_id"]}', '${response.body["card"]["cardholder"]["name"]}', '${req.body["payer"]["email"]}', '${response.body["status"]}', '${response.body["status_detail"]}')`;
          connection.query(sql, (err, rows) => {
            if (err) {
              console.log('Error inserting data into db: ' + err);
              return;
            }
          });

        });

      res.status(201).json({
        detail: data.status_detail,
        status: data.status,
        id: data.id
      });
    })
    .catch(function(error) {
      console.log(error);
      //const { errorMessage, errorStatus }  = validateError(error);
      res.status(errorStatus).json({ error_message: errorMessage });
    });
});
/*
function validateError(error) {
  let errorMessage = 'Unknown error cause';
  let errorStatus = 400;

  if(error.cause) {
    console.log(error.cause)
  }

  return { errorMessage, errorStatus };
}
*/
app.listen(8080, () => {
  console.log("The server is now running on port 8080");
  open("http://localhost:8080");
});
