<?php
// api/mpesa/initiate.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read raw input payload
    $input = file_get_contents("php://input");
    $data = json_decode($input);
    
    if (!empty($data->phone) && !empty($data->amount)) {
        // SmartPay M-Pesa STK Push Gateway configuration
        $apiKey = "54c627d8316f1eb760e8cf43ce1e9724939209303102804691edfb63e3e36e07";
        $url = "https://api.smartpaypesa.com/v1/initiatestk/";
        
        $payload = array(
            "phone" => trim($data->phone),
            "amount" => floatval($data->amount),
            "account_reference" => isset($data->userId) ? trim($data->userId) : "eCiti Payment",
            "description" => isset($data->description) ? trim($data->description) : "Fee Payment"
        );
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "Content-Type: application/json",
            "Authorization: " . $apiKey
        ));
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $responseData = json_decode($response);
            echo json_encode(array(
                "success" => true,
                "message" => "STK Push initiated successfully",
                "checkoutRequestId" => isset($responseData->checkoutRequestId) ? $responseData->checkoutRequestId : "BAYLVMLG"
            ));
        } else {
            echo json_encode(array(
                "success" => false,
                "message" => "Payment Gateway responded with status " . $httpCode
            ));
        }
    } else {
        echo json_encode(array(
            "success" => false,
            "message" => "Incomplete request parameters"
        ));
    }
} else {
    echo json_encode(array(
        "success" => false,
        "message" => "POST method only allowed"
    ));
}
?>
