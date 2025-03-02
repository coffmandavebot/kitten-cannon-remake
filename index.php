<?php
$userid = isset($_GET['userid']) ? $_GET['userid'] : null;

include 'db.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kitten Cannon Remake</title>
    <script>
        const userId = "<?php echo htmlspecialchars($userid, ENT_QUOTES); ?>";
    </script>
    <script type="module" src="scripts/main.js"></script>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <canvas id="cnvs"></canvas>
    <script src="./scripts/main.js" type="module"></script>
</body>
</html>
