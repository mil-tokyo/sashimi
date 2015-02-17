# Sashimi JavaScript Library
Distributed Calculation Framework for JavaScript.

Sashimi is being developed to be the distributed calculation framework easiest to build. All you have to do to be a node of distributed calculation is access a web site via a browser. Projects are sliced into thin pieces and calculated distributedly in your browsers.

## How to Try
A project to learn a convolutional neural network distributedly (DistributedLargeConvnetProject) is implemented. 

### initialize and download dataset
	git submodule init
	git submodule update

### prepare database
+ install MySQL
+ create a user 'sashimi' with password 'password' and a database 'sashimi' with appropriate authorization
+ import etc/database.sql into the database

### run distributor
	cd distributor
	./run.sh

### access distributor with a browser
	access http://localhost:64000/framework

### start distributed calculation
	cd calculation_framework
	./run.sh

Maybe you should use GPGPU since the project above is so time-consuming.
If you would like to use GPGPU, check Sushi ( https://github.com/mil-tokyo/sushi ) and install a WebCL implementation.
