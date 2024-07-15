<?php
// Verificar si se recibió una solicitud POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Recibir los datos del formulario
    $nombre = $_POST['nombre'];
    $email = $_POST['email'];
    $mensaje = $_POST['mensaje'];
    $recaptchaResponse = $_POST['recaptchaResponse'];

    // Clave secreta de reCAPTCHA v3 proporcionada por Google
    $secretKey = '6LcYMhAqAAAAANYrsEiwgUDYaPhJnk57qsq1TEVk';

    // URL de la API de verificación de reCAPTCHA v3
    $url = 'https://www.google.com/recaptcha/api/siteverify';

    // Datos a enviar a la API de verificación de reCAPTCHA v3
    $data = [
        'secret' => $secretKey,
        'response' => $recaptchaResponse
    ];

    // Configurar las opciones de la solicitud HTTP
    $options = [
        'http' => [
            'header' => 'Content-type: application/x-www-form-urlencoded',
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];

    // Crear contexto de solicitud HTTP
    $context = stream_context_create($options);

    // Realizar la solicitud a la API de verificación de reCAPTCHA v3
    $response = file_get_contents($url, false, $context);
    $responseKeys = json_decode($response, true);

    // Verificar la respuesta de reCAPTCHA v3
    if ($responseKeys['success']) {
        // Si la verificación de reCAPTCHA v3 es exitosa, procede con el envío del correo

        // Correo del destinatario
        $to = 'impresion3deco@gmail.com';

        // Asunto del correo
        $subject = "Nuevo mensaje de $nombre desde el formulario de 3Deco";

        // Cuerpo del correo
        $body = "Nombre: $nombre\nEmail: $email\n\nMensaje:\n$mensaje";

        // Encabezados del correo
        $headers = "From: $email";

        // Enviar el correo
        if (mail($to, $subject, $body, $headers)) {
            echo "Mensaje enviado con éxito.";
        } else {
            echo "Error al enviar el mensaje.";
        }
    } else {
        // Si la verificación de reCAPTCHA v3 falla, muestra un mensaje de error
        echo "Error en la verificación del reCAPTCHA v3.";
    }
} else {
    // Si no es una solicitud POST válida, muestra un mensaje de error
    echo "Método de solicitud no válido.";
}
?>
