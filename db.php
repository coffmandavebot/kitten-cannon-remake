<?php
$host = 'localhost';
$db = 'puppycannon';
$user = 'puppycannon';
$pass = 'k32ufasdiu2589asdfkjdfsaflj';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Could not connect to the database $db :" . $e->getMessage());
}
?>
