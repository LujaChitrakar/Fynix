import datetime as dt # to set starting and end date for data we gonna pull
import matplotlib.pyplot as plt 
from matplotlib import style
import pandas as pd 
import pandas_datareader.data as web 

style.use('ggplot')

start = dt.datetime(2000,1,1)
end = dt.datetime.now()

df = web.DataReader('TSLA','yahoo',start,end)
df.reset_index(inplace=True)
df.set_index("Date", inplace=True)
df.head()