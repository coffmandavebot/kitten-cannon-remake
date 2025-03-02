<?php
include 'db.php';

// Get data from POST request
$userid = isset($_POST['userid']) ? $_POST['userid'] : null;
$score = isset($_POST['score']) ? intval($_POST['score']) : 0;

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log request for debugging
$logFile = fopen("score_log.txt", "a");
fwrite($logFile, date("Y-m-d H:i:s") . " - UserID: $userid, Score: $score\n");

if ($userid) {
    try {
        $stmt = $pdo->prepare("INSERT INTO scores (userid, score, created_at) VALUES (:userid, :score, NOW())");
        $result = $stmt->execute([
            ':userid' => $userid,
            ':score' => $score
        ]);
        
        if ($result) {
            fwrite($logFile, "Success: Score saved to database\n");
            fclose($logFile);
            echo json_encode(['success' => true, 'message' => 'Score saved successfully']);
        } else {
            fwrite($logFile, "Error: Database execution failed\n");
            fclose($logFile);
            echo json_encode(['success' => false, 'message' => 'Database execution failed']);
        }
    } catch (PDOException $e) {
        fwrite($logFile, "Error: " . $e->getMessage() . "\n");
        fclose($logFile);
        echo json_encode(['success' => false, 'message' => 'Error saving score: ' . $e->getMessage()]);
    }
} else {
    fwrite($logFile, "Error: Invalid user ID\n");
    fclose($logFile);
    echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
}
?>
