<?php
// Verificar reCAPTCHA
$secretKey = "6LcYMhAqAAAAANYrsEiwgUDYaPhJnk57qsq1TEVk";
$responseKey = $_POST['g-recaptcha-response'];
$ip = $_SERVER['REMOTE_ADDR'];

$url = "https://www.google.com/recaptcha/api/siteverify?secret=$secretKey&response=$responseKey&remoteip=$ip";
$response = file_get_contents($url);
$responseKeys = json_decode($response, true);

if ($responseKeys["success"]) {
    // Procesar el formulario, ya que el usuario pasó la validación reCAPTCHA
    // ...
} else {
    // Mostrar un mensaje de error o redirigir si el usuario no pasó la validación
    // ...
}
?>
