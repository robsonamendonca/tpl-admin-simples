<?php
// Mock API melhorada para fluxo de registro/ativação de dispositivo e ingest de SMS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Responder OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : null;
$dados_recebidos = file_get_contents("php://input");
// Fallback para testes CLI: ler arquivo cli_input.json se stdin estiver vazio
if (empty($dados_recebidos) && php_sapi_name() === 'cli' && file_exists(__DIR__ . '/cli_input.json')) {
    $dados_recebidos = file_get_contents(__DIR__ . '/cli_input.json');
}
$json_obj = json_decode($dados_recebidos, true);

function load_devices() {
    $file = __DIR__ . '/devices.json';
    if (!file_exists($file)) return array();
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : array();
}

function save_devices($devices) {
    file_put_contents(__DIR__ . '/devices.json', json_encode($devices, JSON_PRETTY_PRINT));
}

function append_registration_log($deviceId, $deviceInfo) {
    $line = date('c') . " REGISTER device:$deviceId " . json_encode($deviceInfo) . PHP_EOL;
    file_put_contents(__DIR__ . '/device_registrations.txt', $line, FILE_APPEND);
}

function append_sms_log($deviceId, $remetente, $mensagem) {
    $data_hora = date("Y-m-d H:i:s");
    $linha_log = "[$data_hora]" . ($deviceId ? " [device:$deviceId]" : "") . " DE: $remetente | MENSAGEM: $mensagem" . PHP_EOL;
    file_put_contents(__DIR__ . '/sms_log.txt', $linha_log, FILE_APPEND);
}

function get_bearer_token() {
    $headers = null;
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    if ($headers && isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
    } elseif ($headers && isset($headers['authorization'])) {
        $auth = $headers['authorization'];
    } else {
        // fallback to $_SERVER
        $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : null;
    }
    if ($auth && preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

// Endpoint: ver_logs (GET)
if ($action == 'ver_logs') {
    header("Content-Type: text/plain; charset=UTF-8");
    $path = __DIR__ . '/sms_log.txt';
    if (file_exists($path)) {
        echo file_get_contents($path);
    } else {
        echo "Nenhum SMS recebido ainda. O arquivo de log está vazio.";
    }
    exit;
}

// Endpoint: list_devices (GET)
if ($action == 'list_devices') {
    $devices = load_devices();
    http_response_code(200);
    echo json_encode(array('status' => 'sucesso', 'count' => count($devices), 'devices' => $devices));
    exit;
}

// Endpoint: get_device (GET) requires ?deviceId=...
if ($action == 'get_device') {
    $deviceId = isset($_GET['deviceId']) ? $_GET['deviceId'] : null;
    if (!$deviceId) {
        http_response_code(400);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'deviceId é necessário'));
        exit;
    }
    $devices = load_devices();
    if (!isset($devices[$deviceId])) {
        http_response_code(404);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'device não encontrado'));
        exit;
    }
    http_response_code(200);
    echo json_encode(array('status' => 'sucesso', 'device' => $devices[$deviceId]));
    exit;
}

// Endpoint: register_device (POST)
if ($action == 'register_device') {
    if (empty($json_obj['id_token'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'id_token ausente'));
        exit;
    }

    $id_token = $json_obj['id_token'];
    $deviceInfo = isset($json_obj['deviceInfo']) ? $json_obj['deviceInfo'] : null;
    $autoActivate = isset($json_obj['autoActivate']) ? (bool)$json_obj['autoActivate'] : false;

    $devices = load_devices();
    $deviceId = uniqid('dev_');
    $status = $autoActivate ? 'ACTIVE' : 'PENDING';
    $devices[$deviceId] = array(
        'deviceId' => $deviceId,
        'id_token' => $id_token,
        'deviceInfo' => $deviceInfo,
        'status' => $status,
        'createdAt' => date('c')
    );
    save_devices($devices);

    append_registration_log($deviceId, $deviceInfo);

    http_response_code(200);
    echo json_encode(array('status' => 'sucesso', 'deviceId' => $deviceId, 'policy' => 'default', 'deviceStatus' => $status));
    exit;
}

// Endpoint: activate_device (POST) - activate or revoke
if ($action == 'activate_device') {
    if (empty($json_obj['deviceId']) || !isset($json_obj['activate'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'deviceId e activate são necessários'));
        exit;
    }
    $deviceId = $json_obj['deviceId'];
    $activate = $json_obj['activate'];
    $devices = load_devices();
    if (!isset($devices[$deviceId])) {
        http_response_code(404);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'device não encontrado'));
        exit;
    }
    $devices[$deviceId]['status'] = $activate ? 'ACTIVE' : 'REVOKED';
    $devices[$deviceId]['updatedAt'] = date('c');
    save_devices($devices);

    // Log activation action
    $actLine = date('c') . " ACTIVATE device:$deviceId newStatus:" . $devices[$deviceId]['status'] . PHP_EOL;
    file_put_contents(__DIR__ . '/device_registrations.txt', $actLine, FILE_APPEND);

    http_response_code(200);
    echo json_encode(array('status' => 'sucesso', 'deviceId' => $deviceId, 'newStatus' => $devices[$deviceId]['status']));
    exit;
}

// Endpoint: ingest_sms (POST) - requires device to be ACTIVE
if ($action == 'ingest_sms') {
    // Accept payload with deviceId + remetente + mensagem
    $remetente = isset($json_obj['remetente']) ? htmlspecialchars(strip_tags($json_obj['remetente'])) : null;
    $mensagem = isset($json_obj['mensagem']) ? htmlspecialchars(strip_tags($json_obj['mensagem'])) : null;
    $deviceId = isset($json_obj['deviceId']) ? htmlspecialchars(strip_tags($json_obj['deviceId'])) : null;

    if (empty($remetente) || empty($mensagem)) {
        http_response_code(400);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'Dados incompletos. É necessário remetente e mensagem.'));
        exit;
    }

    // Basic authorization check: prefer deviceId + ACTIVE, or Authorization Bearer matching stored id_token
    $devices = load_devices();
    $bearer = get_bearer_token();
    $authorized = false;

    if ($deviceId && isset($devices[$deviceId]) && $devices[$deviceId]['status'] === 'ACTIVE') {
        $authorized = true;
    } elseif ($bearer) {
        // check if bearer matches any device id_token and that device is ACTIVE
        foreach ($devices as $d) {
            if (isset($d['id_token']) && $d['id_token'] === $bearer && isset($d['status']) && $d['status'] === 'ACTIVE') {
                $deviceId = $d['deviceId'];
                $authorized = true;
                break;
            }
        }
    }

    if (!$authorized) {
        http_response_code(403);
        echo json_encode(array('status' => 'erro', 'mensagem' => 'Device não autorizado ou não ativo'));
        exit;
    }

    // Persist SMS to txt log (and optionally to a JSON file)
    append_sms_log($deviceId, $remetente, $mensagem);

    // Also save a simple JSON record for inspection
    $entry = array('deviceId' => $deviceId, 'remetente' => $remetente, 'mensagem' => $mensagem, 'receivedAt' => date('c'));
    $entriesFile = __DIR__ . '/sms_entries.json';
    $entries = array();
    if (file_exists($entriesFile)) {
        $entries = json_decode(file_get_contents($entriesFile), true);
        if (!is_array($entries)) $entries = array();
    }
    $entries[] = $entry;
    file_put_contents($entriesFile, json_encode($entries, JSON_PRETTY_PRINT));

    http_response_code(200);
    echo json_encode(array('status' => 'sucesso', 'mensagem' => 'SMS registrado na mock-api.', 'deviceId' => $deviceId));
    exit;
}

// Se nenhum action entendido, retornar info básica
http_response_code(200);
echo json_encode(array('status' => 'ok', 'message' => 'mock-api operacional', 'available_actions' => array('ver_logs','list_devices','get_device','register_device','activate_device','ingest_sms')));

?>
