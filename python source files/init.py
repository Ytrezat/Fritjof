# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
def init_board():
    board = [[0,0,0,-1,-1,-1,-1,-1,0,0,0],
             [0,0,0,0,0,-1,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0],
             [-1,0,0,0,0,1,0,0,0,0,-1],
             [-1,0,0,0,1,1,1,0,0,0,-1],
             [-1,-1,0,1,1,2,1,1,0,-1,-1],
             [-1,0,0,0,1,1,1,0,0,0,-1],
             [-1,0,0,0,0,1,0,0,0,0,-1],
             [0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,-1,0,0,0,0,0],
             [0,0,0,-1,-1,-1,-1,-1,0,0,0]]
    return board

def initialize():
    selection = -1000
    variations = [['{',[],""],['}',[],""]]
    i_reader = 0
    board = init_board()
    return selection, board, i_reader, variations