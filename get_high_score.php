<?php
include 'db.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Get current user's score if provided
    $currentScore = isset($_GET['score']) ? intval($_GET['score']) : 0;
    
    // Log to a file for debugging
    $logFile = fopen("percentile_debug.txt", "a");
    fwrite($logFile, "\n\n" . date("Y-m-d H:i:s") . " - DEBUG START - Current score: $currentScore\n");
    
    // Get the global high score
    $highScoreStmt = $pdo->query("SELECT MAX(score) as highScore FROM scores");
    $highScoreResult = $highScoreStmt->fetch(PDO::FETCH_ASSOC);
    $highScore = $highScoreResult['highScore'] ?? '0';
    fwrite($logFile, "High score: $highScore\n");
    
    // Calculate the percentile if a score is provided
    $percentile = 0;
    $lowerScores = 0;
    $totalScores = 0;
    
    if ($currentScore > 0) {
        // Count how many scores are lower than the current score
        $countLowerStmt = $pdo->prepare("SELECT COUNT(*) as lowerScores FROM scores WHERE score < :score");
        $countLowerStmt->execute([':score' => $currentScore]);
        $lowerScoresResult = $countLowerStmt->fetch(PDO::FETCH_ASSOC);
        $lowerScores = $lowerScoresResult['lowerScores'];
        fwrite($logFile, "Lower scores count: $lowerScores\n");
        
        // Count total number of scores
        $totalScoresStmt = $pdo->query("SELECT COUNT(*) as totalScores FROM scores");
        $totalScoresResult = $totalScoresStmt->fetch(PDO::FETCH_ASSOC);
        $totalScores = $totalScoresResult['totalScores'];
        fwrite($logFile, "Total scores count: $totalScores\n");
        
        // Calculate percentile - what percentage of other scores you're better than
        if ($totalScores > 0) {
            // Raw calculation before rounding
            $rawPercentile = ($lowerScores / $totalScores) * 100;
            fwrite($logFile, "Raw percentile calculation: ($lowerScores / $totalScores) * 100 = $rawPercentile\n");
            
            // Round the percentile
            $percentile = round($rawPercentile);
            fwrite($logFile, "Rounded percentile: $percentile\n");
            
            // Special case: if this is a new high score, it's better than 100% of previous scores
            if ($currentScore >= $highScore) {
                $percentile = 100;
                fwrite($logFile, "New high score detected! Setting percentile to 100\n");
            }
        }
    }
    
    // Create a response with all the score data and debug information
    $response = [
        'success' => true,
        'highScore' => $highScore,
        'percentile' => $percentile,
        'totalScores' => $totalScores,
        'debug' => [
            'currentScore' => $currentScore,
            'lowerScores' => $lowerScores,
            'totalScores' => $totalScores,
            'rawPercentile' => $rawPercentile ?? 0,
            'roundedPercentile' => $percentile,
            'isHighScore' => ($currentScore >= $highScore)
        ]
    ];
    
    fwrite($logFile, "Final response: " . json_encode($response) . "\n");
    fwrite($logFile, "DEBUG END\n");
    fclose($logFile);
    
    // Return the data as JSON
    header('Content-Type: application/json');
    echo json_encode($response);
    
} catch (PDOException $e) {
    // Log error for debugging
    $logFile = fopen("score_log.txt", "a");
    fwrite($logFile, date("Y-m-d H:i:s") . " - Error getting scores: " . $e->getMessage() . "\n");
    fclose($logFile);
    
    // Return error response
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Error retrieving scores: ' . $e->getMessage()]);
}
?>
