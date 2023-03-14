const mercadoPagoPublicKey = document.getElementById("mercado-pago-public-key").value;
const mercadopago = new MercadoPago(mercadoPagoPublicKey);

window.addEventListener('load', function() {
    var input = document.querySelector('#user_whatsapp');
    window.intlTelInput(input, {
      separateDialCode: true,
      initialCountry: "mx",
      preferredCountries: ["mx", "us", "pe", "es", "co", "ar", "cl"],
    });
  });

  async function getPhonecontinueSelectNumber(){
    let phoneInput = document.getElementById("user_whatsapp");
    let countryCode = document.querySelector('.iti__selected-dial-code').innerHTML;
    let phoneNumber = countryCode.replace(/[^0-9]/g,'') + phoneInput.value.replace(/[^0-9]/g,'');
    return phoneNumber;
  }

function loadCardForm() {
    const productCost = document.getElementById('amount').value;
    const productDescription = document.getElementById('product-description').innerText;
    const payButton = document.getElementById("form-checkout__submit");
    const validationErrorMessages= document.getElementById('validation-error-messages');

    //funcion para enviar la fecha de hoy al enviar el post para hacer la suscripción
    async function getDateTime() {
        var today = new Date();
        var year = today.getFullYear();
        var month = (today.getMonth() + 1).toString().padStart(2, '0');
        var day = today.getDate().toString().padStart(2, '0');
        var hour = today.getHours().toString().padStart(2, '0');
        var minute = today.getMinutes().toString().padStart(2, '0');
        var second = today.getSeconds().toString().padStart(2, '0');
        var millisecond = today.getMilliseconds().toString().padStart(3, '0');
      
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
      }
      //funcion para obtener la fecha en que termina el plan (1 mes después de que se crea la suscripción)

    async function getDateTimeMonthFromNow() {
        var today = new Date();
        var year = today.getFullYear();
        var month = (today.getMonth() + 2).toString().padStart(2, '0'); // added 1 to month
        var day = today.getDate().toString().padStart(2, '0');
        var hour = today.getHours().toString().padStart(2, '0');
        var minute = today.getMinutes().toString().padStart(2, '0');
        var second = today.getSeconds().toString().padStart(2, '0');
        var millisecond = today.getMilliseconds().toString().padStart(3, '0');
    
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
    }


    const form = {
        id: "form-checkout",
        cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Holder name",
        },
        cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
        },
        cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Card number",
            style: {
                fontSize: "1rem"
            },
        },
        expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YYYY",
            style: {
                fontSize: "1rem"
            },
        },
        securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Security code",
            style: {
                fontSize: "1rem"
            },
        },
        installments: {
            id: "form-checkout__installments",
            placeholder: "Installments",
        },
        issuer: {
            id: "form-checkout__issuer",
            placeholder: "Issuer",
        },
    };

    const cardForm = mercadopago.cardForm({
        amount: "127.0",
        iframe: true,
        form,
        callbacks: {
            onFormMounted: error => {
                if (error)
                    return console.warn("Form Mounted handling error: ", error);
                console.log("Form mounted");
            },
            onSubmit: async event => {
                event.preventDefault();
                document.getElementById("loading-message").style.display = "block";

                const {
                    paymentMethodId,
                    issuerId,
                    cardholderEmail: email,
                    amount,
                    token,
                    installments,
                } = cardForm.getCardFormData();

                fetch("/process_payment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        issuerId,
                        paymentMethodId,
                        transactionAmount: Number(amount),
                        installments: Number(installments),
                        description: productDescription,
                        external_reference: await getPhonecontinueSelectNumber(),
                        payer: {
                            email
                        },
                    }),
                })
                    .then(response => {
                        return response.json();
                    })
                    .then(result => {
                        if(!result.hasOwnProperty("error_message")) {
                            //obtenemos el 
                            document.getElementById("success-response").style.display = "block";
                            document.getElementById("payment-id").innerText = result.id;
                            document.getElementById("payment-status").innerText = result.status;
                            document.getElementById("payment-detail").innerText = result.detail;
                        } else {
                            document.getElementById("error-message").textContent = result.error_message;
                            document.getElementById("fail-response").style.display = "block";
                        }
                        
                        $('.container__payment').fadeOut(500);
                        setTimeout(() => { $('.container__result').show(500).fadeIn(); }, 500);
                    })
                    .catch(error => {
                        alert("Unexpected error\n"+JSON.stringify(error));
                    });
            },
            onFetching: (resource) => {
                console.log("Fetching resource: ", resource);
                payButton.setAttribute('disabled', true);
                return () => {
                    payButton.removeAttribute("disabled");
                };
            },
            onCardTokenReceived: async (errorData, token)  => {
                if (errorData && errorData.error.fieldErrors.length !== 0) {
                    errorData.error.fieldErrors.forEach(errorMessage => {
                        alert(errorMessage);
                    });
                }
                //obtener fechas de suscripcion
                var today = await getDateTime();
                var monthFromNow = await getDateTimeMonthFromNow();
                //creamos la subscripcion con ese token 
                fetch("/preapproval", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer [MERCADO PAGO ACCESS TOKEN]"
                    },
                    body: JSON.stringify({
                        preapproval_plan_id: "2c93808486c6a9e80186c9d9b5fb01c8",
                        reason: "ChatGPT in Whatsapp - Plan ilimitado",
                        payer_email: document.getElementById("form-checkout__cardholderEmail").value,
                        card_token_id: token["token"], //aquí estamos enviando el token que llegó del pago
                        auto_recurring: {
                            frequency: 1,
                            frequency_type:"months",
                            start_date: today,
                            end_date: monthFromNow,
                            transaction_amount: 127.00,
                            currency_id: "MXN"
                        },
                        back_url: "https://wa.link/t6pvm6",
                        status: "authorized"
                    
                    }),
                })
                .then(response => {
                    return response.json();
                })
                .then(result => {
                    console.log(result)
                })
                .catch(error => {
                    alert("Unexpected error\n"+JSON.stringify(error));
                });

                return token;
            },
            onValidityChange: (error, field) => {
                const input = document.getElementById(form[field].id);
                removeFieldErrorMessages(input, validationErrorMessages);
                addFieldErrorMessages(input, validationErrorMessages, error);
                enableOrDisablePayButton(validationErrorMessages, payButton);
            }
        },
    });
};

function removeFieldErrorMessages(input, validationErrorMessages) {
    Array.from(validationErrorMessages.children).forEach(child => {
        const shouldRemoveChild = child.id.includes(input.id);
        if (shouldRemoveChild) {
            validationErrorMessages.removeChild(child);
        }
    });
}

function addFieldErrorMessages(input, validationErrorMessages, error) {
    if (error) {
        input.classList.add('validation-error');
        error.forEach((e, index) => {
            const p = document.createElement('p');
            p.id = `${input.id}-${index}`;
            p.innerText = e.message;
            validationErrorMessages.appendChild(p);
        });
    } else {
        input.classList.remove('validation-error');
    }
}

function enableOrDisablePayButton(validationErrorMessages, payButton) {
    if (validationErrorMessages.children.length > 0) {
        payButton.setAttribute('disabled', true);
    } else {
        payButton.removeAttribute('disabled');
    }
}

// Handle transitions
document.getElementById('checkout-btn').addEventListener('click', function(){
    $('.container__cart').fadeOut(500);
    setTimeout(() => {
        loadCardForm();
        $('.container__payment').show(500).fadeIn();
    }, 500);
});

document.getElementById('go-back').addEventListener('click', function(){
    $('.container__payment').fadeOut(500);
    setTimeout(() => { $('.container__cart').show(500).fadeIn(); }, 500);
});

// Handle price update
function updatePrice(){
    let quantity = document.getElementById('quantity').innerHTML;
    let unitPrice = document.getElementById('unit-price').innerText;
    let amount = parseInt(unitPrice) * parseInt(quantity);

    document.getElementById('cart-total').innerText = '$ ' + amount;
    document.getElementById('summary-price').innerText = '$ ' + unitPrice;
    document.getElementById('summary-quantity').innerText = quantity;
    document.getElementById('summary-total').innerText = '$ ' + amount;
    document.getElementById('amount').value = amount;
};

document.getElementById('quantity').addEventListener('change', updatePrice);
updatePrice();
