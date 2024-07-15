<?php
$secretKey = "6LcYMhAqAAAAANYrsEiwgUDYaPhJnk57qsq1TEVk";
$token = $_POST['g-recaptcha-response'];
$url = "https://www.google.com/recaptcha/api/siteverify";

$data = array(
    'secret' => $secretKey,
    'response' => $token, //algunos le ponen captcha
    'remoteip' => $ip
);

$options = array(
    'http' => array(
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    )
);

//data y options estan en formato array()

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
$responseKeys = json_decode($response, true);

if ($responseKeys["success"]) {
    // Procesar el formulario, ya que el usuario pasó la validación reCAPTCHA v3
    $to = "impresion3deco@gmail.com"; 

    // Email subject
    $subject = "Nuevo mensaje de $nombre desde el formulario de 3Deco";

    // Email body
    $body = "Nombre: $nombre\nEmail: $email\n\nMensaje:\n$mensaje";

    // Email headers
    $headers = "From: $email";

    // Send email
    if (mail($to, $subject, $body, $headers)) {
        echo "Mensaje enviado con éxito.";
    } else {
        echo "Error al enviar el mensaje.";
    }

} else {
    // Mostrar un mensaje de error o redirigir si el usuario no pasó la validación
    echo "Error en la verificación del captcha.";
    //SUS 

}
?>
