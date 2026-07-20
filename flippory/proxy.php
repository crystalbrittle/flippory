<?php
// proxy.php

// -------------------------------------------------------------------
// Mitigation #3: Restrict CORS (Open Proxy Abuse)
// -------------------------------------------------------------------
$allowedOrigins = [
    'http://bludgeonsoft.org',
    'https://bludgeonsoft.org',
    'http://www.bludgeonsoft.org',
    'https://www.bludgeonsoft.org',
    'http://localhost',       // For local development
    'http://127.0.0.1'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if ($origin) {
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: " . $origin);
    } else {
        http_response_code(403);
        die('Origin not allowed');
    }
}
// If no Origin header is sent (e.g., direct browser hit), we don't output 
// the Access-Control-Allow-Origin header, which naturally prevents cross-origin abuse.

$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url) {
    http_response_code(400);
    die('Missing url parameter');
}

// Basic validation
if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    die('Invalid url parameter');
}

// -------------------------------------------------------------------
// Mitigation #1: Prevent SSRF (Server-Side Request Forgery)
// -------------------------------------------------------------------
$parsedUrl = parse_url($url);
$host = $parsedUrl['host'];

// Resolve the hostname to an IP address
$ip = gethostbyname($host);

if ($ip === $host && !filter_var($host, FILTER_VALIDATE_IP)) {
     http_response_code(400);
     die('Could not resolve host');
}

// Check if the IP is in a private, loopback, or reserved range
if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
    http_response_code(403);
    die('Access to internal or reserved IP addresses is forbidden');
}


// -------------------------------------------------------------------
// Mitigation #2: Prevent Resource Exhaustion (DoS)
// -------------------------------------------------------------------
$port = isset($parsedUrl['port']) ? $parsedUrl['port'] : (strtolower($parsedUrl['scheme']) === 'https' ? 443 : 80);

$action = isset($_GET['action']) ? $_GET['action'] : 'fetch';

if ($action === 'size') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RESOLVE, ["{$host}:{$port}:{$ip}"]);
    curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'FlipporyProxy/1.0');
    curl_exec($ch);
    
    $error = curl_error($ch);
    $size = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    header('Content-Type: application/json');
    if ($error || $httpCode >= 400) {
        echo json_encode(['error' => true]);
    } else {
        echo json_encode(['size' => ($size > 0 ? $size : null)]);
    }
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);

// Force curl to use the IP we just validated to prevent DNS rebinding attacks
curl_setopt($ch, CURLOPT_RESOLVE, ["{$host}:{$port}:{$ip}"]);

curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second absolute maximum execution time
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // 5 second connection timeout
curl_setopt($ch, CURLOPT_USERAGENT, 'FlipporyProxy/1.0');

// Stream the response and abort if it exceeds 15MB
$maxSize = 15 * 1024 * 1024; 
$content = '';
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($handle, $data) use (&$content, $maxSize) {
    $content .= $data;
    if (strlen($content) > $maxSize) {
        return 0; // Returning less than the data length aborts the transfer
    }
    return strlen($data);
});

curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    die('Failed to fetch image: ' . $error);
}

// -------------------------------------------------------------------
// Mitigation #4: Validate Content (XSS Prevention)
// -------------------------------------------------------------------
// getimagesizefromstring will fail if the content is HTML, SVG, or not a real image.
// This strictly prevents returning malicious scripts masked as images.
$imageInfo = @getimagesizefromstring($content);

if ($imageInfo === false) {
    http_response_code(415);
    die('Fetched content is not a valid raster image format supported by the proxy');
}

$mimeType = $imageInfo['mime'];
if (strpos($mimeType, 'image/') !== 0) {
    http_response_code(415);
    die('Invalid image mime type');
}

// Send the verified content type
header("Content-Type: " . $mimeType);
echo $content;
?>
