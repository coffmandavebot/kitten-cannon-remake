<?php
include 'db.php';

// Get user ID from request
$userId = isset($_GET['userId']) ? $_GET['userId'] : null;

// Log file for debugging
$logFile = fopen("personal_highscore_log.txt", "a") or die("Unable to open log file!");
fwrite($logFile, "Request received at " . date('Y-m-d H:i:s') . "\n");
fwrite($logFile, "User ID: " . ($userId ?? 'null') . "\n");

if ($userId) {
    try {
        // Query the scores table for this user's highest score
        $stmt = $pdo->prepare("SELECT MAX(score) as highScore FROM scores WHERE userid = :userId");
        $stmt->execute([':userId' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $personalHighScore = $result['highScore'] ?? 0;
        
        fwrite($logFile, "Found personal high score: $personalHighScore\n");
        
        // Return success with the score
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'personalHighScore' => $personalHighScore
        ]);
        
    } catch (PDOException $e) {
        fwrite($logFile, "Error: " . $e->getMessage() . "\n");
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
} else {
    fwrite($logFile, "Error: User ID is required\n");
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'User ID is required'
    ]);
}

fclose($logFile);
?>