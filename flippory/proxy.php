<?php
// proxy.php
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url) {
    http_response_code(400);
    die('Missing url parameter');
}

// Basic validation to ensure it's an HTTP/HTTPS URL
if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    die('Invalid url parameter');
}

// Fetch the image
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: FlipporyProxy/1.0\r\n",
        'ignore_errors' => true
    ]
]);

$content = @file_get_contents($url, false, $context);

if ($content === false) {
    http_response_code(500);
    die('Failed to fetch image');
}

// Extract content type from the headers
$contentType = 'application/octet-stream';
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/^Content-Type:\s*(.+)$/i', $header, $matches)) {
            $contentType = $matches[1];
            break;
        }
    }
}

// Ensure it's roughly an image content type (optional, but good for security)
if (strpos($contentType, 'image/') !== 0 && strpos($contentType, 'application/octet-stream') !== 0) {
    // If it's HTML or something else, it might be an error page
    $contentType = 'application/octet-stream';
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: " . $contentType);
echo $content;
?>
