<?php
$secretKey = "6LcYMhAqAAAAANYrsEiwgUDYaPhJnk57qsq1TEVk";
$token = $_POST['g-recaptcha-response'];

// Realizar la verificación del token usando cURL o cualquier método adecuado
$url = "https://www.google.com/recaptcha/api/siteverify";
$data = [
    'secret' => $secretKey,
    'response' => $token
];

$options = [
    'http' => [
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
$responseKeys = json_decode($response, true);

if ($responseKeys["success"]) {
    // Procesar el formulario, ya que el usuario pasó la validación reCAPTCHA v3
    // ...
} else {
    // Mostrar un mensaje de error o redirigir si el usuario no pasó la validación
    // ...
}
?>
