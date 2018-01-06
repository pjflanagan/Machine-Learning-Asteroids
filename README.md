# Machine Learning Asteroids Genetic Algorithm

## Run
run `python -m SimpleHTTPServer` within the source folder.

## Element Properties

## Neural Network
The spaceship's brain has 8 input neurons:
- 1 representing the orientation
- 1 representing the velocity
- 6 representing the location of the 3 closest asteroids in relation to the ship
The spaceship has 6 neurons in its hidden layer, and 4 in the output layer:
1. accelerates when greater than 0.5 and coasts otherwise
2. fires a bullet when greater than 0.5 and holds fire otherwise
3. rotates the ship when greater than 0.5 and maintains orientation otherwise
4. rotates left when greater than 0.5 and right otherwise

## Genetic Algorithm

## Tutorial Reference
- [AskForGameTask](https://www.askforgametask.com/tutorial/machine-learning-algorithm-flappy-bird/)
- [ZekeChan.net](http://www.zekechan.net/asteroids-html5-game-tutorial-1/)