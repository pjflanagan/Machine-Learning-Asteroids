# Machine Learning Asteroids Genetic Algorithm

This website is designed to teach a neural network to play the arcade game asteroids.
10 ships spawn in and gain points by staying alive, moving, and shooting asteroids,
which break into smaller asteroids. The game restarts with new AI's after
all ships are destroyed.

## Run
Run `python -m SimpleHTTPServer` within the source folder.
Visit the page outputted. Add `?player=true` to play as the red fighter.

## Element Properties
### Asteroids
Asteroids are worth the same amount of points at all sizes.

### Ships
| Property      | Value         | 
| ------------- |:-------------:|
| Max Velocity  | 220           | 

### Bullets
Bullets cost the ship points when they hit nothing.
| Property      | Value         | 
| ------------- |:-------------:|
| Speed         | 600           | 


## Neural Network
The spaceship's brain has 8 input neurons, which recieve the distance to the
closest asteroid in each direction.

The spaceship has 6 neurons in its hidden layer, and 4 in the output layer:
1. accelerates when greater than 0.5 and coasts otherwise
2. fires a bullet when greater than 0.5 and holds fire otherwise
3. rotates the ship when greater than 0.5 and maintains orientation otherwise
4. rotates left when greater than 0.5 and right otherwise

## Genetic Algorithm
Spaceships are rewarded for moving, as it is sometimes to their advantage to stay put,
but that behavior is boring. 

## Tutorial Reference
- [AskForGameTask](https://www.askforgametask.com/tutorial/machine-learning-algorithm-flappy-bird/)
- [ZekeChan.net](http://www.zekechan.net/asteroids-html5-game-tutorial-1/)